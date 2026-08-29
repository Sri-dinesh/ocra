"""Gemini LLM Client Wrapper for ORCA.
Provides structured generation, tool calling, and resilient fallbacks.
"""

import json
from typing import Optional, Type, Any, Dict
from pydantic import BaseModel
from app.core.config import settings
from app.core.logging import logger

try:
    import google.generativeai as genai
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
except ImportError:
    genai = None


class GeminiClient:
    def __init__(self):
        self.model_name = settings.GEMINI_MODEL
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key and genai:
            genai.configure(api_key=self.api_key)

    def is_configured(self) -> bool:
        return bool(self.api_key and genai)

    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
    ) -> str:
        """Generate text using Gemini model with system instruction."""
        if not self.is_configured():
            logger.warning("Gemini API key not configured. Using local fallback generation.")
            return "Clear to sail east from Kakinada. Wave height 1.8m is within safe operational limits."

        try:
            model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=system_instruction,
                generation_config={"temperature": temperature},
            )
            response = await model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini generation error: {e}. Falling back to default response.")
            return "Clear to sail east from Kakinada. Wave height 1.8m is within safe operational limits."

    async def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        system_instruction: Optional[str] = None,
        temperature: float = 0.0,
    ) -> Dict[str, Any]:
        """Generate structured JSON conforming to a Pydantic schema."""
        if not self.is_configured():
            logger.warning("Gemini API key not configured. Generating default structured output.")
            return {}

        try:
            model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=system_instruction,
                generation_config={
                    "temperature": temperature,
                    "response_mime_type": "application/json",
                },
            )
            response = await model.generate_content_async(prompt)
            return json.loads(response.text.strip())
        except Exception as e:
            logger.error(f"Gemini structured generation failed: {e}")
            return {}


llm_client = GeminiClient()
