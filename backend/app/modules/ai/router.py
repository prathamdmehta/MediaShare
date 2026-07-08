# app/modules/ai/router.py

import json
import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.media.models import MediaFile

router = APIRouter()
settings = get_settings()


class VoiceCommandRequest(BaseModel):
    transcript: str  # raw speech-to-text output


class VoiceCommandResponse(BaseModel):
    action: str                    # "share" | "unclear" | "confirm"
    matched_files: list[dict]      # files matching description
    recipient_username: str | None
    message: str | None
    confidence: float
    ai_response: str               # human-readable explanation


@router.post("/voice-command", response_model=VoiceCommandResponse)
async def process_voice_command(
    data: VoiceCommandRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Parse a voice command and match it to files + recipients.

    Example transcript:
    "Share the Q4 report PDF with userb"
    "Send my latest photo to pratham"
    "Transfer the video I uploaded yesterday to alice"
    """

    # Get user's uploaded files
    result = await db.execute(
        select(MediaFile)
        .where(MediaFile.owner_id == current_user.id)
        .where(MediaFile.processing_status == "ready")
        .order_by(MediaFile.created_at.desc())
        .limit(50)
    )
    files = result.scalars().all()

    files_context = [
        {
            "id": str(f.id),
            "name": f.original_name,
            "type": f.file_type,
            "size_bytes": f.size_bytes,
            "created_at": f.created_at.isoformat(),
        }
        for f in files
    ]

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    prompt = f"""You are an AI assistant for a file sharing app called MediaShare.

The user said: "{data.transcript}"

The user has these files available:
{json.dumps(files_context, indent=2)}

Parse the user's intent and respond with a JSON object ONLY (no other text):
{{
  "action": "share" | "unclear",
  "matched_file_ids": ["uuid1", "uuid2"],
  "recipient_username": "username or null",
  "message": "optional note to include or null",
  "confidence": 0.0 to 1.0,
  "explanation": "brief explanation of what you understood"
}}

Rules:
- Match files by name similarity, type, or relative time ("yesterday", "latest", "recent")
- Extract the recipient username exactly as mentioned
- If multiple files match, include all of them (max 20)
- If unclear who to send to or what file, set action to "unclear"
- confidence > 0.7 means you are sure of the match"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        ai_result = json.loads(message.content[0].text)
    except Exception:
        raise HTTPException(500, "AI parsing failed")

    matched_file_ids = ai_result.get("matched_file_ids", [])
    matched_files = [
        f for f in files_context if f["id"] in matched_file_ids
    ]

    return VoiceCommandResponse(
        action=ai_result.get("action", "unclear"),
        matched_files=matched_files,
        recipient_username=ai_result.get("recipient_username"),
        message=ai_result.get("message"),
        confidence=ai_result.get("confidence", 0.0),
        ai_response=ai_result.get("explanation", ""),
    )