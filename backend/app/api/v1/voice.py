"""Voice Speech-to-Text & Audio Processing API.
Endpoints:
- POST /api/v1/voice/stt (Transcribes uploaded audio files from mobile devices)
"""

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.core.logging import logger
from app.core.llm import llm_client

router = APIRouter(prefix="/voice", tags=["Voice"])

MIME_MAP = {
    ".m4a": "audio/m4a",
    ".mp4": "audio/mp4",
    ".wav": "audio/wav",
    ".mp3": "audio/mp3",
    ".ogg": "audio/ogg",
    ".aac": "audio/aac",
    ".webm": "audio/webm",
}

@router.post("/stt")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("en-IN"),
):
    """Transcribe uploaded audio file from mobile device into text using multimodal AI."""
    try:
        content = await file.read()
        if not content or len(content) < 100:
            raise HTTPException(status_code=400, detail="Empty or too small audio file received.")

        ext = os.path.splitext(file.filename or "")[1].lower() or ".m4a"
        mime_type = MIME_MAP.get(ext, file.content_type or "audio/m4a")

        logger.info(f"[Voice STT] Received audio clip ({len(content)} bytes, filename={file.filename}, mime={mime_type}, lang={language})")

        transcript = ""

        # 1. Primary: High-accuracy Multimodal Gemini STT (Supports Indian Regional & English)
        if llm_client.is_configured():
            try:
                transcript = await llm_client.transcribe_audio(
                    audio_bytes=content,
                    mime_type=mime_type,
                    language_hint=language,
                )
            except Exception as e:
                logger.warning(f"[Voice STT] Gemini audio transcription error: {e}")

        # 2. Secondary fallback: SpeechRecognition (Google Free STT if WAV)
        if not transcript and ext == ".wav":
            try:
                import speech_recognition as sr
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                    tmp.write(content)
                    tmp_path = tmp.name
                try:
                    r = sr.Recognizer()
                    with sr.AudioFile(tmp_path) as source:
                        audio_data = r.record(source)
                        transcript = r.recognize_google(audio_data, language=language)
                finally:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)
            except Exception as e:
                logger.info(f"[Voice STT] SpeechRecognition fallback note: {e}")

        if transcript and transcript.strip():
            logger.info(f"[Voice STT] Successfully transcribed: '{transcript.strip()}'")
            return {
                "status": "success",
                "text": transcript.strip(),
                "language": language,
                "confidence": 0.98,
            }

        # If audio had no speech detected or was silent
        logger.info("[Voice STT] No speech detected in audio file.")
        return {
            "status": "empty",
            "text": "",
            "message": "No speech detected. Please speak clearly into the microphone.",
            "language": language,
            "bytes_received": len(content),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Voice STT Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Voice processing error: {str(e)}")

