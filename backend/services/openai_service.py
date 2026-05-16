import os
from typing import Optional

from fastapi import HTTPException
from openai import AsyncOpenAI


class OpenAIService:
    """Thin wrapper around the OpenAI Async client.

    The API key check is deferred until the first `complete()` call so the
    FastAPI app can boot (and the rest of the routes can serve) even when
    the developer has not yet configured `OPENAI_API_KEY`.
    """

    def __init__(self) -> None:
        self._client: Optional[AsyncOpenAI] = None
        self.model = "gpt-4o-mini"

    def _get_client(self) -> AsyncOpenAI:
        if self._client is not None:
            return self._client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail=(
                    "OPENAI_API_KEY is not configured on the backend. "
                    "Add it to backend/.env and restart the server."
                ),
            )
        self._client = AsyncOpenAI(api_key=api_key)
        return self._client

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
    ) -> str:
        client = self._get_client()
        try:
            response = await client.chat.completions.create(
                model=self.model,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI call failed: {exc}",
            ) from exc
        return response.choices[0].message.content or ""
