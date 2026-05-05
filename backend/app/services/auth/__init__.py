"""Auth Service Package"""

from .auth_service import AuthService, auth_service
from .wechat_oauth import WeChatOAuthService, wechat_oauth_service, WeChatUserInfo

__all__ = [
    "AuthService", 
    "auth_service",
    "WeChatOAuthService",
    "wechat_oauth_service",
    "WeChatUserInfo",
]
