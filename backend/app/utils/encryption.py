"""
Encryption Utilities

AES-256 encryption for sensitive data storage.
Provides SQLAlchemy TypeDecorator for automatic field encryption.
"""

import os
import base64
import hashlib
from typing import Optional, Any
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend


class AESCipher:
    """
    AES-256-CBC 加密工具类
    
    用于对敏感数据（如聊天记录、量表分数）进行加密存储。
    """
    
    # 从环境变量获取密钥，如果没有则生成默认密钥（仅用于开发）
    _DEFAULT_KEY = "PsyAntigravity2024SecretKey!@#$%"
    
    def __init__(self, key: Optional[str] = None):
        """
        初始化加密器
        
        Args:
            key: 32字符密钥（256位）。如不提供则使用环境变量或默认值。
        """
        key_str = key or os.getenv("ENCRYPTION_KEY", self._DEFAULT_KEY)
        
        # 确保密钥是32字节 (256位)
        key_bytes = key_str.encode('utf-8')
        self._key = hashlib.sha256(key_bytes).digest()
        
        self._backend = default_backend()
    
    def _generate_iv(self) -> bytes:
        """生成随机初始化向量 (16字节)"""
        return os.urandom(16)
    
    def encrypt(self, plaintext: str) -> str:
        """
        加密字符串
        
        Args:
            plaintext: 明文字符串
            
        Returns:
            Base64编码的加密字符串 (IV + 密文)
        """
        if not plaintext:
            return ""
        
        # 生成IV
        iv = self._generate_iv()
        
        # 填充明文到块大小的整数倍
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(plaintext.encode('utf-8')) + padder.finalize()
        
        # 创建加密器
        cipher = Cipher(
            algorithms.AES(self._key),
            modes.CBC(iv),
            backend=self._backend
        )
        encryptor = cipher.encryptor()
        
        # 加密
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()
        
        # 拼接 IV + 密文 并 Base64 编码
        encrypted = base64.b64encode(iv + ciphertext).decode('utf-8')
        
        return encrypted
    
    def decrypt(self, ciphertext: str) -> str:
        """
        解密字符串
        
        Args:
            ciphertext: Base64编码的加密字符串
            
        Returns:
            解密后的明文字符串
        """
        if not ciphertext:
            return ""
        
        try:
            # Base64 解码
            encrypted_data = base64.b64decode(ciphertext.encode('utf-8'))
            
            # 分离 IV 和密文
            iv = encrypted_data[:16]
            actual_ciphertext = encrypted_data[16:]
            
            # 创建解密器
            cipher = Cipher(
                algorithms.AES(self._key),
                modes.CBC(iv),
                backend=self._backend
            )
            decryptor = cipher.decryptor()
            
            # 解密
            padded_plaintext = decryptor.update(actual_ciphertext) + decryptor.finalize()
            
            # 移除填充
            unpadder = padding.PKCS7(128).unpadder()
            plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()
            
            return plaintext.decode('utf-8')
        
        except Exception as e:
            print(f"Decryption failed: {e}")
            return ""
    
    def encrypt_dict(self, data: dict) -> str:
        """
        加密字典对象
        
        Args:
            data: 要加密的字典
            
        Returns:
            加密后的字符串
        """
        import json
        return self.encrypt(json.dumps(data, ensure_ascii=False))
    
    def decrypt_dict(self, ciphertext: str) -> dict:
        """
        解密字典对象
        
        Args:
            ciphertext: 加密的字符串
            
        Returns:
            解密后的字典
        """
        import json
        plaintext = self.decrypt(ciphertext)
        if not plaintext:
            return {}
        return json.loads(plaintext)


# SQLAlchemy TypeDecorator for automatic encryption
try:
    from sqlalchemy import TypeDecorator, Text
    
    class EncryptedString(TypeDecorator):
        """
        SQLAlchemy 自动加密字段类型
        
        使用方法:
            class ChatMessage(Base):
                content = Column(EncryptedString())
        """
        impl = Text
        cache_ok = True
        
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._cipher = AESCipher()
        
        def process_bind_param(self, value: Any, dialect) -> Optional[str]:
            """存入数据库前加密"""
            if value is None:
                return None
            if isinstance(value, str):
                return self._cipher.encrypt(value)
            return self._cipher.encrypt(str(value))
        
        def process_result_value(self, value: Any, dialect) -> Optional[str]:
            """从数据库读取后解密"""
            if value is None:
                return None
            return self._cipher.decrypt(value)
    
    
    class EncryptedJSON(TypeDecorator):
        """
        SQLAlchemy 自动加密JSON字段类型
        
        使用方法:
            class Assessment(Base):
                scores = Column(EncryptedJSON())
        """
        impl = Text
        cache_ok = True
        
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._cipher = AESCipher()
        
        def process_bind_param(self, value: Any, dialect) -> Optional[str]:
            """存入数据库前加密"""
            if value is None:
                return None
            return self._cipher.encrypt_dict(value)
        
        def process_result_value(self, value: Any, dialect) -> Optional[dict]:
            """从数据库读取后解密"""
            if value is None:
                return None
            return self._cipher.decrypt_dict(value)

except ImportError:
    # SQLAlchemy not installed
    EncryptedString = None
    EncryptedJSON = None


# 全局加密器实例
aes_cipher = AESCipher()


# 便捷函数
def encrypt(plaintext: str) -> str:
    """加密字符串"""
    return aes_cipher.encrypt(plaintext)


def decrypt(ciphertext: str) -> str:
    """解密字符串"""
    return aes_cipher.decrypt(ciphertext)
