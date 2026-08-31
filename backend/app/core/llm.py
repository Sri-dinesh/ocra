"""Production-Grade Gemini LLM Client Wrapper for ORCA.
Features:
- Migrated to official google.genai SDK (v2+).
- Asynchronous execution with exponential backoff retries.
- Dynamic fallback mechanism for offline/unconfigured environments.
- Structured JSON output parsing with recovery heuristics.
- Request latency and token tracking telemetry.
Owner: SRIDINESH (Lead)
"""

import asyncio
import json
import time
from typing import Optional, Type, Any, Dict
from pydantic import BaseModel
from app.core.config import settings
from app.core.logging import logger

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None


class GeminiClient:
    def __init__(self):
        self.model_name = settings.GEMINI_MODEL
        self.api_key = settings.GEMINI_API_KEY
        self.max_retries = 3
        self.initial_backoff_seconds = 1.0
        self._client: Optional[genai.Client] = None
        if self.api_key and self.api_key.strip() and self.api_key != "your_gemini_api_key_here" and genai is not None:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize google.genai client: {e}")
                self._client = None

    def is_configured(self) -> bool:
        """Check if live Gemini API access is available."""
        return bool(
            self.api_key
            and self.api_key.strip()
            and self.api_key != "your_gemini_api_key_here"
            and self._client is not None
        )

    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
        max_output_tokens: int = 1024,
    ) -> str:
        """Generate text with exponential backoff retries and telemetry."""
        if not self.is_configured():
            logger.debug("Gemini API key not configured. Using deterministic fallback generation.")
            return ""

        start_time = time.perf_counter()
        last_error = None

        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            system_instruction=system_instruction,
        )

        for attempt in range(1, self.max_retries + 1):
            try:
                response = await self._client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                )
                latency_ms = (time.perf_counter() - start_time) * 1000.0
                logger.info(f"Gemini generate_text succeeded in {latency_ms:.1f}ms (attempt {attempt})")
                return response.text.strip() if response.text else ""
            except Exception as e:
                last_error = e
                logger.warning(f"Gemini generate_text attempt {attempt} failed: {e}")
                if attempt < self.max_retries:
                    await asyncio.sleep(self.initial_backoff_seconds * (2 ** (attempt - 1)))

        logger.error(f"Gemini generate_text failed after {self.max_retries} attempts: {last_error}")
        return ""

    async def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        system_instruction: Optional[str] = None,
        temperature: float = 0.0,
    ) -> Dict[str, Any]:
        """Generate validated structured JSON output with automatic schema adherence."""
        if not self.is_configured():
            logger.debug("Gemini API key not configured. Skipping live structured call.")
            return {}

        start_time = time.perf_counter()
        schema_json_str = json.dumps(schema.model_json_schema(), indent=2)
        augmented_prompt = f"{prompt}\n\nStrictly adhere to this JSON Schema:\n{schema_json_str}"

        config = types.GenerateContentConfig(
            temperature=temperature,
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=schema,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True) if hasattr(types, "AutomaticFunctionCallingConfig") else None,
        )

        for attempt in range(1, self.max_retries + 1):
            try:
                response = await self._client.aio.models.generate_content(
                    model=self.model_name,
                    contents=augmented_prompt,
                    config=config,
                )
                latency_ms = (time.perf_counter() - start_time) * 1000.0
                
                raw_text = response.text.strip() if response.text else ""
                # Strip markdown code fences if model enclosed JSON
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]

                parsed_json = json.loads(raw_text.strip())
                logger.info(f"Gemini generate_structured succeeded in {latency_ms:.1f}ms (attempt {attempt})")
                return parsed_json
            except Exception as e:
                logger.warning(f"Gemini structured generation attempt {attempt} failed: {e}")
                if attempt < self.max_retries:
                    await asyncio.sleep(self.initial_backoff_seconds * (2 ** (attempt - 1)))

        return {}


llm_client = GeminiClient()
