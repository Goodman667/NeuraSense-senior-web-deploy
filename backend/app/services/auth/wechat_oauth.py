"""
WeChat OAuth Service

Implements WeChat Open Platform OAuth 2.0 for web QR code login.
Reference: https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
"""

import os
import httpx
from dataclasses import dataclass
from typing import Optional
from datetime import datetime
import secrets
import json
from pathlib import Path


# WeChat OAuth Configuration
WECHAT_APP_ID = os.getenv("WECHAT_APP_ID", "")
WECHAT_APP_SECRET = os.getenv("WECHAT_APP_SECRET", "")

# OAuth URLs - Using Public Account (公众号) authorization, not Open Platform
# 公众号授权只能在微信内置浏览器中使用
WECHAT_AUTHORIZE_URL = "https://open.weixin.qq.com/connect/oauth2/authorize"
WECHAT_ACCESS_TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token"
WECHAT_USER_INFO_URL = "https://api.weixin.qq.com/sns/userinfo"

# Data storage
DATA_DIR = Path("./data")
WECHAT_USERS_FILE = DATA_DIR / "wechat_users.json"


@dataclass
class WeChatUserInfo:
    """WeChat user profile data"""
    openid: str
    nickname: str
    sex: int  # 1=male, 2=female, 0=unknown
    province: str
    city: str
    country: str
    headimgurl: str
    unionid: Optional[str] = None


@dataclass
class WeChatOAuthResult:
    """Result of WeChat OAuth flow"""
    success: bool
    access_token: Optional[str] = None
    openid: Optional[str] = None
    user_info: Optional[WeChatUserInfo] = None
    error: Optional[str] = None


class WeChatOAuthService:
    """
    WeChat OAuth 2.0 Service for Public Account (公众号) authorization.
    
    NOTE: This only works when the page is opened INSIDE WeChat app!
    Desktop browsers cannot use this login method.
    
    Flow:
    1. User opens page in WeChat browser
    2. Redirect to WeChat authorization URL
    3. User confirms authorization
    4. WeChat redirects back with authorization code
    5. Backend exchanges code for access token
    6. Backend fetches user info using access token
    7. Create or link user account
    """
    
    def __init__(self):
        DATA_DIR.mkdir(exist_ok=True)
        if not WECHAT_USERS_FILE.exists():
            WECHAT_USERS_FILE.write_text("{}")
    
    def _load_wechat_users(self) -> dict:
        """Load WeChat user mappings (openid -> user_id)"""
        return json.loads(WECHAT_USERS_FILE.read_text())
    
    def _save_wechat_users(self, data: dict):
        """Save WeChat user mappings"""
        WECHAT_USERS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    
    def get_oauth_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        """
        Generate WeChat OAuth authorization URL for Public Account.
        
        NOTE: This URL only works inside WeChat app browser!
        
        Args:
            redirect_uri: Callback URL after authorization
            state: Optional anti-CSRF state parameter
            
        Returns:
            Authorization URL to redirect user to
        """
        if not state:
            state = secrets.token_urlsafe(16)
        
        params = {
            "appid": WECHAT_APP_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "snsapi_userinfo",  # Public account scope (获取用户信息)
            "state": state,
        }
        
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{WECHAT_AUTHORIZE_URL}?{query}#wechat_redirect"
    
    async def exchange_code_for_token(self, code: str) -> WeChatOAuthResult:
        """
        Exchange authorization code for access token.
        
        Args:
            code: Authorization code from WeChat callback
            
        Returns:
            WeChatOAuthResult with token or error
        """
        params = {
            "appid": WECHAT_APP_ID,
            "secret": WECHAT_APP_SECRET,
            "code": code,
            "grant_type": "authorization_code",
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(WECHAT_ACCESS_TOKEN_URL, params=params)
                data = response.json()
            
            if "errcode" in data:
                return WeChatOAuthResult(
                    success=False,
                    error=f"WeChat error: {data.get('errmsg', 'Unknown error')}"
                )
            
            return WeChatOAuthResult(
                success=True,
                access_token=data["access_token"],
                openid=data["openid"],
            )
        except Exception as e:
            return WeChatOAuthResult(success=False, error=str(e))
    
    async def get_user_info(self, access_token: str, openid: str) -> WeChatOAuthResult:
        """
        Fetch WeChat user profile using access token.
        
        Args:
            access_token: Valid access token
            openid: User's OpenID
            
        Returns:
            WeChatOAuthResult with user info or error
        """
        params = {
            "access_token": access_token,
            "openid": openid,
            "lang": "zh_CN",
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(WECHAT_USER_INFO_URL, params=params)
                data = response.json()
            
            if "errcode" in data:
                return WeChatOAuthResult(
                    success=False,
                    error=f"WeChat error: {data.get('errmsg', 'Unknown error')}"
                )
            
            user_info = WeChatUserInfo(
                openid=data["openid"],
                nickname=data.get("nickname", "微信用户"),
                sex=data.get("sex", 0),
                province=data.get("province", ""),
                city=data.get("city", ""),
                country=data.get("country", ""),
                headimgurl=data.get("headimgurl", ""),
                unionid=data.get("unionid"),
            )
            
            return WeChatOAuthResult(
                success=True,
                access_token=access_token,
                openid=openid,
                user_info=user_info,
            )
        except Exception as e:
            return WeChatOAuthResult(success=False, error=str(e))
    
    def link_wechat_to_user(self, openid: str, user_id: str):
        """
        Link WeChat account to existing user.
        
        Args:
            openid: WeChat OpenID
            user_id: Platform user ID
        """
        wechat_users = self._load_wechat_users()
        wechat_users[openid] = {
            "user_id": user_id,
            "linked_at": datetime.now().isoformat(),
        }
        self._save_wechat_users(wechat_users)
    
    def get_linked_user_id(self, openid: str) -> Optional[str]:
        """
        Get platform user ID linked to WeChat account.
        
        Args:
            openid: WeChat OpenID
            
        Returns:
            User ID if linked, None otherwise
        """
        wechat_users = self._load_wechat_users()
        if openid in wechat_users:
            return wechat_users[openid]["user_id"]
        return None
    
    def is_wechat_linked(self, user_id: str) -> bool:
        """
        Check if user has linked WeChat account.
        
        Args:
            user_id: Platform user ID
            
        Returns:
            True if WeChat is linked
        """
        wechat_users = self._load_wechat_users()
        for openid, data in wechat_users.items():
            if data["user_id"] == user_id:
                return True
        return False


# Global service instance
wechat_oauth_service = WeChatOAuthService()
