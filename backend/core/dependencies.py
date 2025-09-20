import asyncio
import logging
from fastapi import Request, Depends, HTTPException

from core.config import get_g_vars, DEFAULT_TEST_USER_ID, APP_ENV
from models.schemas import SettingsModel

logger = logging.getLogger(__name__)

async def get_user_id_from_token(request: Request) -> str:
    """
    Validates the bearer token and returns the user ID.
    Raises 401 Unauthorized in production if the token is invalid or missing.
    """
    auth_header = request.headers.get("Authorization")
    g_vars = get_g_vars()
    supabase = g_vars["supabase"]

    if not auth_header:
        if APP_ENV == "development":
            logger.warning("No Authorization header. Using default test user.")
            return DEFAULT_TEST_USER_ID
        raise HTTPException(status_code=401, detail="Authorization header is required.")

    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme.")

        user_response = await asyncio.to_thread(supabase.auth.get_user, token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
        
        return user_response.user.id
    except Exception as e:
        logger.error(f"Authentication failed: {e}", exc_info=True)
        if APP_ENV == "development":
            logger.warning("Authentication failed. Falling back to default test user.")
            return DEFAULT_TEST_USER_ID
        raise HTTPException(status_code=401, detail="Could not validate credentials.")


async def get_current_user_settings(user_id: str = Depends(get_user_id_from_token)) -> SettingsModel:
    """Retrieves settings for the current user from Supabase."""
    g_vars = get_g_vars()
    supabase = g_vars["supabase"]
    try:
        response = supabase.table("user_configs").select(
            "bot_name, selected_persona, custom_prompt, answer_styles, meeting_domains"
        ).eq("user_id", user_id).single().execute()

        if response.data:
            return SettingsModel(
                botName=response.data.get("bot_name", "SpikedAI"),
                selectedPersona=response.data.get("selected_persona", "balanced"),
                customPrompt=response.data.get("custom_prompt", ""),
                selectedAnswerStyles=response.data.get("answer_styles", []),
                meetingDomains=response.data.get("meeting_domains", [])
            )
        return SettingsModel()
    except Exception:
        return SettingsModel()