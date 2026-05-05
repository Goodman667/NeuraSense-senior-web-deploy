import json

import pytest
from postgrest.exceptions import APIError

import app.api as api_root
from app.api import profile_router, wechat_auth_router
from app.services.auth import auth_service, wechat_oauth_service


@pytest.mark.asyncio
async def test_get_profile_bootstraps_legacy_user_as_completed(tmp_path, monkeypatch):
    profiles_file = tmp_path / "user_profiles.json"

    monkeypatch.setattr(profile_router, "DATA_DIR", tmp_path)
    monkeypatch.setattr(profile_router, "PROFILES_FILE", profiles_file)
    monkeypatch.setattr(profile_router, "is_supabase_available", lambda: False)
    monkeypatch.setattr(
        profile_router.auth_service,
        "validate_token",
        lambda token: {"id": "legacy-user", "username": "legacy", "nickname": "legacy"},
    )

    result = await profile_router.get_profile("demo-token")

    assert result["success"] is True
    assert result["profile"]["user_id"] == "legacy-user"
    assert result["profile"]["onboarding_completed"] is True

    saved_profiles = json.loads(profiles_file.read_text(encoding="utf-8"))
    assert saved_profiles[0]["user_id"] == "legacy-user"
    assert saved_profiles[0]["onboarding_completed"] is True


@pytest.mark.asyncio
async def test_register_bootstraps_new_user_profile_as_incomplete(tmp_path, monkeypatch):
    profiles_file = tmp_path / "user_profiles.json"

    monkeypatch.setattr(profile_router, "DATA_DIR", tmp_path)
    monkeypatch.setattr(profile_router, "PROFILES_FILE", profiles_file)
    monkeypatch.setattr(profile_router, "is_supabase_available", lambda: False)

    fake_user = {
        "id": "new-user",
        "username": "fresh",
        "nickname": "fresh",
        "created_at": "2026-05-05T00:00:00",
    }

    monkeypatch.setattr(auth_service, "register", lambda username, password, nickname=None: fake_user)

    response = await api_root.register(
        api_root.RegisterRequest(username="fresh", password="secret123", nickname="fresh")
    )

    assert response["success"] is True

    saved_profiles = json.loads(profiles_file.read_text(encoding="utf-8"))
    assert saved_profiles[0]["user_id"] == "new-user"
    assert saved_profiles[0]["onboarding_completed"] is False


@pytest.mark.asyncio
async def test_wechat_register_bootstraps_new_user_profile_as_incomplete(tmp_path, monkeypatch):
    profiles_file = tmp_path / "user_profiles.json"

    monkeypatch.setattr(profile_router, "DATA_DIR", tmp_path)
    monkeypatch.setattr(profile_router, "PROFILES_FILE", profiles_file)
    monkeypatch.setattr(profile_router, "is_supabase_available", lambda: False)

    fake_user = {
        "id": "wx-user",
        "username": "wx_12345678",
        "nickname": "微信用户",
        "created_at": "2026-05-05T00:00:00",
    }

    monkeypatch.setattr(auth_service, "register", lambda username, password, nickname=None: fake_user)
    monkeypatch.setattr(
        auth_service,
        "login",
        lambda username, password: {"token": "wx-token", "user": fake_user},
    )
    monkeypatch.setattr(wechat_oauth_service, "link_wechat_to_user", lambda openid, user_id: None)
    monkeypatch.setattr(auth_service, "_load_users", lambda: [dict(fake_user, avatar=None)])
    monkeypatch.setattr(auth_service, "_save_users", lambda users: None)

    response = await wechat_auth_router.register_with_wechat(
        openid="1234567890abcdef",
        nickname="微信用户",
        avatar="https://example.com/avatar.png",
    )

    assert response.success is True
    saved_profiles = json.loads(profiles_file.read_text(encoding="utf-8"))
    assert saved_profiles[0]["user_id"] == "wx-user"
    assert saved_profiles[0]["onboarding_completed"] is False


@pytest.mark.asyncio
async def test_update_profile_falls_back_when_supabase_schema_lacks_new_columns(tmp_path, monkeypatch):
    profiles_file = tmp_path / "user_profiles.json"

    monkeypatch.setattr(profile_router, "DATA_DIR", tmp_path)
    monkeypatch.setattr(profile_router, "PROFILES_FILE", profiles_file)
    monkeypatch.setattr(profile_router, "is_supabase_available", lambda: True)
    monkeypatch.setattr(
        profile_router.auth_service,
        "validate_token",
        lambda token: {"id": "schema-user", "username": "schema", "nickname": "schema"},
    )

    class FakeSupabaseTable:
        def upsert(self, data, on_conflict="user_id"):
            raise APIError(
                {
                    "code": "PGRST204",
                    "details": None,
                    "hint": None,
                    "message": "Could not find the 'ui_mode' column of 'user_profile' in the schema cache",
                }
            )

    class FakeSupabaseClient:
        def table(self, name):
            assert name == "user_profile"
            return FakeSupabaseTable()

    monkeypatch.setattr(profile_router, "get_supabase_client", lambda: FakeSupabaseClient())

    response = await profile_router.update_profile(
        profile_router.ProfileUpdate(
            onboarding_completed=True,
            goals=["stress"],
            practices=["breathing"],
            reminder_freq="daily",
            reminder_time="09:00",
            baseline_sleep=6,
            baseline_stress=5,
            baseline_mood=6,
            baseline_energy=5,
            ui_mode="standard",
        ),
        "demo-token",
    )

    assert response["success"] is True
    assert response["profile"]["user_id"] == "schema-user"
    assert response["profile"]["onboarding_completed"] is True
    assert response["profile"]["goals"] == ["stress"]

    saved_profiles = json.loads(profiles_file.read_text(encoding="utf-8"))
    assert saved_profiles[0]["user_id"] == "schema-user"
    assert saved_profiles[0]["onboarding_completed"] is True
