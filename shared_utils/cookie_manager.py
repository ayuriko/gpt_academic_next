"""
Cookie/session management utilities for the API server.
Legacy Gradio functions are removed — this module provides API-compatible equivalents.
"""
import json
import uuid


def load_chat_cookies():
    """Create default cookies dict for a new session."""
    from toolbox import get_conf
    API_KEY, LLM_MODEL = get_conf("API_KEY", "LLM_MODEL")
    return {
        "api_key": API_KEY,
        "llm_model": LLM_MODEL,
        "uuid": uuid.uuid4(),
        "user_name": "default_user",
    }
