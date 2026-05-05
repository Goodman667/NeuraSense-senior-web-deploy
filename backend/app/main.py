"""
PsyAntigravity Backend Application

Intelligent Psychological Assessment Platform
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

# Load .env before any other imports that use env vars
from dotenv import load_dotenv
load_dotenv()

# Render uses ZHIPU_API_KEY; code uses LLM_API_KEY — bridge the gap
import os
if not os.getenv("LLM_API_KEY") and os.getenv("ZHIPU_API_KEY"):
    os.environ["LLM_API_KEY"] = os.environ["ZHIPU_API_KEY"]

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router as api_router


def _sync_seed_data_to_supabase():
    """Push local seed data (tools, program_days) to Supabase if rows are missing."""
    try:
        from app.services.database.supabase_client import get_supabase_client, is_supabase_available
        if not is_supabase_available():
            return

        import json
        from pathlib import Path

        sb = get_supabase_client()
        data_dir = Path("./data")

        # --- Sync tool_items from v2 seed ---
        v2_file = data_dir / "tool_items_v2.json"
        if v2_file.exists():
            from app.api.tools_router import _load_seed_tools
            seed_tools = _load_seed_tools()
            if seed_tools:
                existing = sb.table("tool_items").select("id").execute()
                existing_ids = {r["id"] for r in (existing.data or [])}
                new_tools = [t for t in seed_tools if t["id"] not in existing_ids]
                if new_tools:
                    for t in new_tools:
                        t["is_active"] = True
                    sb.table("tool_items").insert(new_tools).execute()
                    print(f"[Sync] Inserted {len(new_tools)} new tools into Supabase")
                else:
                    print(f"[Sync] All {len(seed_tools)} tools already in Supabase")

        # --- Sync program_days ---
        days_file = data_dir / "program_days.json"
        if days_file.exists():
            all_days = json.loads(days_file.read_text(encoding="utf-8"))
            existing = sb.table("program_days").select("program_id,day_number").execute()
            existing_keys = {(r["program_id"], r["day_number"]) for r in (existing.data or [])}
            new_days = [d for d in all_days if (d["program_id"], d["day_number"]) not in existing_keys]
            if new_days:
                try:
                    # Try inserting with all fields (including video_url, video_title)
                    sb.table("program_days").insert(new_days).execute()
                    print(f"[Sync] Inserted {len(new_days)} new program_days into Supabase")
                except Exception:
                    # Fallback: strip fields not in Supabase schema
                    safe_cols = {"program_id", "day_number", "title", "learn_text", "tool_id", "review_question", "tip"}
                    safe_days = [{k: v for k, v in d.items() if k in safe_cols} for d in new_days]
                    sb.table("program_days").insert(safe_days).execute()
                    print(f"[Sync] Inserted {len(safe_days)} program_days (without video columns)")
            else:
                print(f"[Sync] All {len(all_days)} program_days already in Supabase")

            # --- Update existing rows missing video_url ---
            try:
                seed_lookup = {(d["program_id"], d["day_number"]): d for d in all_days}
                missing_video = sb.table("program_days").select("id,program_id,day_number,video_url").is_("video_url", "null").execute()
                rows_to_update = missing_video.data or []
                updated = 0
                for row in rows_to_update:
                    seed = seed_lookup.get((row["program_id"], row["day_number"]))
                    if seed and seed.get("video_url"):
                        sb.table("program_days").update({
                            "video_url": seed["video_url"],
                            "video_title": seed.get("video_title", ""),
                        }).eq("id", row["id"]).execute()
                        updated += 1
                if updated:
                    print(f"[Sync] Updated {updated} program_days with video_url/video_title")
            except Exception as e:
                print(f"[Sync] Video column update skipped: {e}")

        # --- Sync programs ---
        programs_file = data_dir / "programs.json"
        if programs_file.exists():
            all_programs = json.loads(programs_file.read_text(encoding="utf-8"))
            existing = sb.table("programs").select("id").execute()
            existing_ids = {r["id"] for r in (existing.data or [])}
            new_programs = [p for p in all_programs if p["id"] not in existing_ids]
            if new_programs:
                sb.table("programs").insert(new_programs).execute()
                print(f"[Sync] Inserted {len(new_programs)} new programs into Supabase")

    except Exception as e:
        print(f"[Sync] Seed data sync failed (non-fatal): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler for startup and shutdown events.
    Initialize database connections and other resources here.
    """
    # Startup: Initialize connections
    print("PsyAntigravity Backend Starting...")
    _sync_seed_data_to_supabase()
    yield
    # Shutdown: Clean up resources
    print("PsyAntigravity Backend Shutting Down...")


app = FastAPI(
    title="PsyAntigravity API",
    description="智能心理测评平台 API - Intelligent Psychological Assessment Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS for frontend access (allow all for demo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root() -> dict[str, str]:
    """
    Root endpoint - Health check and welcome message.
    """
    return {
        "message": "欢迎使用 PsyAntigravity 智能心理测评平台",
        "status": "healthy",
        "version": "0.1.0",
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    """
    Health check endpoint for container orchestration.
    """
    return {"status": "healthy"}
