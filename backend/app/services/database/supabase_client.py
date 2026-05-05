"""
Supabase Database Connection Module

Provides a singleton Supabase client for database operations.
"""

import os
from typing import Optional

# Try to import supabase, but gracefully handle if not available
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None

# Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://iewxxoyziijeznwwyivv.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Singleton client instance
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """
    Get or create the Supabase client singleton.
    Returns None if Supabase is not configured or available.
    """
    global _supabase_client
    
    if not SUPABASE_AVAILABLE:
        print("Warning: supabase-py not installed, using fallback storage")
        return None
    
    if not SUPABASE_KEY:
        print("Warning: SUPABASE_KEY not set, using fallback storage")
        return None
    
    if _supabase_client is None:
        try:
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            print(f"Supabase client connected to {SUPABASE_URL}")
        except Exception as e:
            print(f"Failed to create Supabase client: {e}")
            return None
    
    return _supabase_client


def is_supabase_available() -> bool:
    """Check if Supabase is available and configured."""
    return get_supabase_client() is not None
