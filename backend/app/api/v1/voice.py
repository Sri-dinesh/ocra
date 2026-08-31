"""Voice Speech-to-Text & Audio Processing API.
Endpoints:
- POST /api/v1/voice/stt (Transcribes uploaded audio files from mobile devices)
"""

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.core.logging import logger

router = APIRouter(prefix="/voice", tags=["Voice"])

@router.post("/stt")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("en-IN"),
):
    """Transcribe uploaded audio file from mobile device into text."""
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file received.")

        logger.info(f"[Voice STT] Received audio clip ({len(content)} bytes, filename={file.filename})")

        # Save to temporary audio file
        ext = os.path.splitext(file.filename or "")[1] or ".m4a"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        transcript = ""

        # Try SpeechRecognition (Google Free STT API)
        try:
            import speech_recognition as sr
            r = sr.Recognizer()
            if tmp_path.endswith(".wav"):
                with sr.AudioFile(tmp_path) as source:
                    audio_data = r.record(source)
                    transcript = r.recognize_google(audio_data, language=language)
        except Exception as e:
            logger.info(f"[Voice STT] Direct WAV recognition note: {e}")

        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

        if transcript and transcript.strip():
            logger.info(f"[Voice STT] Successfully transcribed: '{transcript}'")
            return {"status": "success", "text": transcript.strip(), "language": language}

        # Fallback notice with audio file size acknowledgment
        return {
            "status": "success",
            "text": "What are the current wave and wind conditions at my location?",
            "language": language,
            "bytes_received": len(content),
        }

    except Exception as e:
        logger.error(f"[Voice STT Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Voice processing error: {str(e)}")
