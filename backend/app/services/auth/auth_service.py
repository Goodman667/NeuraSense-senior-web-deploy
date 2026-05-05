"""
Authentication Service

Provides user authentication, registration, and session management.
Uses Supabase for persistent storage, with file-based fallback for development.
"""

import hashlib
import secrets
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

# Import Supabase client
from ..database.supabase_client import get_supabase_client, is_supabase_available

# 数据存储路径 (fallback)
DATA_DIR = Path("./data")
USERS_FILE = DATA_DIR / "users.json"
SESSIONS_FILE = DATA_DIR / "sessions.json"
HISTORY_FILE = DATA_DIR / "assessment_history.json"


class User(BaseModel):
    """用户模型"""
    id: str
    username: str
    nickname: str
    password_hash: str
    created_at: str
    avatar: Optional[str] = None


class Session(BaseModel):
    """会话模型"""
    token: str
    user_id: str
    created_at: str
    expires_at: str


class AssessmentRecord(BaseModel):
    """评估记录"""
    id: str
    user_id: str
    scale_type: str  # phq9, gad7, etc.
    total_score: int
    answers: list[int]
    severity: str
    ai_interpretation: Optional[str] = None
    created_at: str


class AuthService:
    """认证服务 - 支持 Supabase 和本地文件双模式"""

    def __init__(self):
        self.supabase = get_supabase_client()
        self.use_supabase = self.supabase is not None
        
        if self.use_supabase:
            print("AuthService: Using Supabase for storage")
        else:
            print("AuthService: Using local file storage (fallback)")
            # 确保数据目录存在
            DATA_DIR.mkdir(exist_ok=True)
            self._init_files()

    def _init_files(self):
        """初始化数据文件"""
        if not USERS_FILE.exists():
            USERS_FILE.write_text("[]", encoding='utf-8')
        if not SESSIONS_FILE.exists():
            SESSIONS_FILE.write_text("[]", encoding='utf-8')
        if not HISTORY_FILE.exists():
            HISTORY_FILE.write_text("[]", encoding='utf-8')

    def _hash_password(self, password: str) -> str:
        """密码哈希"""
        return hashlib.sha256(password.encode()).hexdigest()

    def _generate_token(self) -> str:
        """生成会话令牌"""
        return secrets.token_urlsafe(32)

    def _generate_id(self) -> str:
        """生成唯一ID"""
        return secrets.token_hex(8)

    # ========== Supabase Methods ==========
    
    def _supabase_get_users(self) -> list[dict]:
        """从 Supabase 加载用户"""
        try:
            response = self.supabase.table("users").select("*").execute()
            return response.data or []
        except Exception as e:
            print(f"Supabase error loading users: {e}")
            return []

    def _supabase_save_user(self, user: dict):
        """保存用户到 Supabase"""
        try:
            self.supabase.table("users").insert(user).execute()
        except Exception as e:
            print(f"Supabase error saving user: {e}")
            raise

    def _supabase_get_sessions(self) -> list[dict]:
        """从 Supabase 加载会话"""
        try:
            response = self.supabase.table("sessions").select("*").execute()
            return response.data or []
        except Exception as e:
            print(f"Supabase error loading sessions: {e}")
            return []

    def _supabase_save_session(self, session: dict):
        """保存会话到 Supabase"""
        try:
            self.supabase.table("sessions").insert(session).execute()
        except Exception as e:
            print(f"Supabase error saving session: {e}")
            raise

    # ========== File Methods (Fallback) ==========
    
    def _load_users(self) -> list[dict]:
        """加载用户数据"""
        if self.use_supabase:
            return self._supabase_get_users()
        try:
            return json.loads(USERS_FILE.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            USERS_FILE.write_text("[]", encoding='utf-8')
            return []

    def _save_users(self, users: list[dict]):
        """保存用户数据"""
        if not self.use_supabase:
            USERS_FILE.write_text(json.dumps(users, ensure_ascii=False, indent=2), encoding='utf-8')

    def _load_sessions(self) -> list[dict]:
        """加载会话数据"""
        if self.use_supabase:
            return self._supabase_get_sessions()
        try:
            return json.loads(SESSIONS_FILE.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            SESSIONS_FILE.write_text("[]", encoding='utf-8')
            return []

    def _save_sessions(self, sessions: list[dict]):
        """保存会话数据"""
        if not self.use_supabase:
            SESSIONS_FILE.write_text(json.dumps(sessions, ensure_ascii=False, indent=2), encoding='utf-8')

    def _load_history(self) -> list[dict]:
        """加载评估历史"""
        try:
            return json.loads(HISTORY_FILE.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            HISTORY_FILE.write_text("[]", encoding='utf-8')
            return []

    def _save_history(self, history: list[dict]):
        """保存评估历史"""
        HISTORY_FILE.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding='utf-8')

    # ========== Public Methods ==========
    
    def register(self, username: str, password: str, nickname: str = None) -> dict:
        """用户注册"""
        users = self._load_users()

        # 检查用户名是否存在
        if any(u["username"] == username for u in users):
            raise ValueError("用户名已存在")

        # 创建用户
        user = {
            "id": self._generate_id(),
            "username": username,
            "nickname": nickname or username,
            "password_hash": self._hash_password(password),
            "created_at": datetime.now().isoformat(),
            "avatar": None,
        }

        if self.use_supabase:
            self._supabase_save_user(user)
        else:
            users.append(user)
            self._save_users(users)

        # 返回用户信息（不含密码）
        return {
            "id": user["id"],
            "username": user["username"],
            "nickname": user["nickname"],
            "created_at": user["created_at"],
        }

    def login(self, username: str, password: str) -> dict:
        """用户登录"""
        users = self._load_users()
        password_hash = self._hash_password(password)

        # 查找用户
        user = next(
            (u for u in users if u["username"] == username and u["password_hash"] == password_hash),
            None
        )

        if not user:
            raise ValueError("用户名或密码错误")

        # 创建会话
        token = self._generate_token()
        session = {
            "token": token,
            "user_id": user["id"],
            "created_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(days=7)).isoformat(),
        }
        
        if self.use_supabase:
            self._supabase_save_session(session)
        else:
            sessions = self._load_sessions()
            sessions.append(session)
            self._save_sessions(sessions)

        return {
            "token": token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "nickname": user["nickname"],
                "created_at": user["created_at"],
            }
        }

    def validate_token(self, token: str) -> Optional[dict]:
        """验证令牌"""
        sessions = self._load_sessions()
        users = self._load_users()

        session = next((s for s in sessions if s["token"] == token), None)
        if not session:
            return None

        # 检查过期
        if datetime.fromisoformat(session["expires_at"]) < datetime.now():
            return None

        # 获取用户
        user = next((u for u in users if u["id"] == session["user_id"]), None)
        if not user:
            return None

        return {
            "id": user["id"],
            "username": user["username"],
            "nickname": user["nickname"],
        }

    def logout(self, token: str) -> bool:
        """用户登出"""
        if self.use_supabase:
            try:
                self.supabase.table("sessions").delete().eq("token", token).execute()
                return True
            except Exception:
                return False
        else:
            sessions = self._load_sessions()
            sessions = [s for s in sessions if s["token"] != token]
            self._save_sessions(sessions)
            return True

    def get_assessment_history(self, user_id: str) -> list[dict]:
        """获取用户的评估历史"""
        history = self._load_history()
        return [h for h in history if h.get("user_id") == user_id]

    def get_user_history(self, user_id: str, scale_type: str | None = None) -> list[dict]:
        """获取用户评估历史，按时间倒序，可按量表过滤"""
        history = self._load_history()
        filtered = [h for h in history if h.get("user_id") == user_id]

        if scale_type:
            filtered = [h for h in filtered if h.get("scale_type") == scale_type]

        # 按创建时间倒序
        try:
            filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        except Exception:
            pass

        return filtered

    def save_assessment(self, user_id: str, scale_type: str, total_score: int,
                        answers: list[int], severity: str, ai_interpretation: str = None) -> dict:
        """保存评估结果"""
        record = {
            "id": self._generate_id(),
            "user_id": user_id,
            "scale_type": scale_type,
            "total_score": total_score,
            "answers": answers,
            "severity": severity,
            "ai_interpretation": ai_interpretation,
            "created_at": datetime.now().isoformat(),
        }

        history = self._load_history()
        history.append(record)
        self._save_history(history)

        return record


# 创建全局服务实例
auth_service = AuthService()
