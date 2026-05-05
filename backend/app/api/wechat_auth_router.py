"""
WeChat OAuth API Router

Endpoints for WeChat QR code login flow.
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import secrets

from app.services.auth import auth_service, wechat_oauth_service


router = APIRouter(prefix="/auth/wechat", tags=["WeChat Auth"])


class WeChatLoginUrlResponse(BaseModel):
    """WeChat OAuth URL response"""
    auth_url: str
    state: str


class WeChatCallbackResponse(BaseModel):
    """WeChat login callback response"""
    success: bool
    token: Optional[str] = None
    user: Optional[dict] = None
    is_new_user: bool = False
    needs_binding: bool = False
    wechat_info: Optional[dict] = None
    error: Optional[str] = None


class BindWeChatRequest(BaseModel):
    """Request to bind WeChat to existing account"""
    username: str
    password: str
    openid: str
    wechat_nickname: str
    wechat_avatar: str


# Store temporary states for CSRF protection
_oauth_states: dict[str, dict] = {}


@router.get("/url", response_model=WeChatLoginUrlResponse)
async def get_wechat_login_url(
    redirect_uri: str = Query(
        default="https://b24dbaf9.natappfree.cc/api/v1/auth/wechat/callback",
        description="Callback URL after WeChat authorization (NATAPP domain)"
    ),
    frontend_url: str = Query(
        default="http://localhost:3000",
        description="Frontend URL to redirect after successful login"
    )
) -> WeChatLoginUrlResponse:
    """
    Get WeChat OAuth authorization URL for QR code login.
    
    The frontend should redirect the user to this URL.
    After user scans QR code and authorizes, WeChat will redirect
    to the backend callback URL with an authorization code.
    """
    state = secrets.token_urlsafe(16)
    auth_url = wechat_oauth_service.get_oauth_url(redirect_uri, state)
    
    # Store state for validation (expires in 10 minutes)
    _oauth_states[state] = {
        "created_at": datetime.now().isoformat(),
        "redirect_uri": redirect_uri,
        "frontend_url": frontend_url,
    }
    
    # Clean up old states
    now = datetime.now()
    expired_states = [
        s for s, data in _oauth_states.items()
        if (now - datetime.fromisoformat(data["created_at"])).total_seconds() > 600
    ]
    for s in expired_states:
        del _oauth_states[s]
    
    return WeChatLoginUrlResponse(auth_url=auth_url, state=state)


@router.get("/callback")
async def wechat_callback(
    code: str = Query(..., description="Authorization code from WeChat"),
    state: str = Query(..., description="Anti-CSRF state parameter"),
):
    """
    Handle WeChat OAuth callback.
    
    Exchange authorization code for access token, fetch user info,
    and redirect to frontend with login token or binding info.
    """
    # Get frontend URL from stored state
    frontend_url = "http://localhost:3000"
    
    # Validate state (CSRF protection)
    if state not in _oauth_states:
        return RedirectResponse(
            url=f"{frontend_url}?wechat_error=invalid_state",
            status_code=302
        )
    
    state_data = _oauth_states.pop(state)
    frontend_url = state_data.get("frontend_url", frontend_url)
    
    # Exchange code for access token
    token_result = await wechat_oauth_service.exchange_code_for_token(code)
    if not token_result.success:
        error_msg = token_result.error or "token_exchange_failed"
        return RedirectResponse(
            url=f"{frontend_url}?wechat_error={error_msg}",
            status_code=302
        )
    
    # Fetch user info
    user_result = await wechat_oauth_service.get_user_info(
        token_result.access_token,
        token_result.openid
    )
    if not user_result.success:
        error_msg = user_result.error or "userinfo_failed"
        return RedirectResponse(
            url=f"{frontend_url}?wechat_error={error_msg}",
            status_code=302
        )
    
    wechat_info = user_result.user_info
    openid = wechat_info.openid
    
    # Check if WeChat account is already linked
    linked_user_id = wechat_oauth_service.get_linked_user_id(openid)
    
    if linked_user_id:
        # User already linked, log them in
        users = auth_service._load_users()
        user = next((u for u in users if u["id"] == linked_user_id), None)
        
        if user:
            # Create session
            sessions = auth_service._load_sessions()
            token = auth_service._generate_token()
            session = {
                "token": token,
                "user_id": user["id"],
                "created_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(days=7)).isoformat(),
            }
            sessions.append(session)
            auth_service._save_sessions(sessions)
            
            # Redirect to frontend with token
            import urllib.parse
            user_json = urllib.parse.quote(str({
                "id": user["id"],
                "username": user["username"],
                "nickname": user["nickname"],
                "avatar": wechat_info.headimgurl or user.get("avatar", ""),
            }).replace("'", '"'))
            
            return RedirectResponse(
                url=f"{frontend_url}?wechat_token={token}&wechat_user={user_json}",
                status_code=302
            )
    
    # WeChat account not linked, redirect with binding info
    import urllib.parse
    wechat_data = urllib.parse.quote(str({
        "openid": openid,
        "nickname": wechat_info.nickname,
        "avatar": wechat_info.headimgurl or "",
    }).replace("'", '"'))
    
    return RedirectResponse(
        url=f"{frontend_url}?wechat_bind={wechat_data}",
        status_code=302
    )


@router.post("/bind")
async def bind_wechat_account(request: BindWeChatRequest) -> WeChatCallbackResponse:
    """
    Bind WeChat account to existing platform account.
    
    User provides username/password to authenticate, then links WeChat.
    """
    try:
        # Verify existing account
        login_result = auth_service.login(request.username, request.password)
        user = login_result["user"]
        
        # Link WeChat to this account
        wechat_oauth_service.link_wechat_to_user(request.openid, user["id"])
        
        # Update user avatar if not set
        users = auth_service._load_users()
        for u in users:
            if u["id"] == user["id"]:
                if not u.get("avatar") and request.wechat_avatar:
                    u["avatar"] = request.wechat_avatar
                break
        auth_service._save_users(users)
        
        return WeChatCallbackResponse(
            success=True,
            token=login_result["token"],
            user={
                **user,
                "avatar": request.wechat_avatar or user.get("avatar"),
            },
            is_new_user=False,
            needs_binding=False,
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/register-new")
async def register_with_wechat(
    openid: str,
    nickname: str,
    avatar: str = "",
) -> WeChatCallbackResponse:
    """
    Create new account using WeChat identity.
    
    For users who don't have an existing account and want to
    register directly with their WeChat credentials.
    """
    # Generate unique username from openid
    username = f"wx_{openid[:8]}"
    # Generate random password (user can set later)
    password = secrets.token_urlsafe(12)
    
    try:
        # Register new user
        user = auth_service.register(username, password, nickname)
        from app.api.profile_router import bootstrap_user_profile
        bootstrap_user_profile(user["id"], onboarding_completed=False)
        
        # Link WeChat
        wechat_oauth_service.link_wechat_to_user(openid, user["id"])
        
        # Update avatar
        users = auth_service._load_users()
        for u in users:
            if u["id"] == user["id"]:
                u["avatar"] = avatar
                break
        auth_service._save_users(users)
        
        # Login
        login_result = auth_service.login(username, password)
        
        return WeChatCallbackResponse(
            success=True,
            token=login_result["token"],
            user={
                **login_result["user"],
                "avatar": avatar,
            },
            is_new_user=True,
            needs_binding=False,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
