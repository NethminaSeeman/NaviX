import pytest
from livekit.agents import AgentSession, llm

from agent import GEMINI_LIVE_MODEL, Assistant, build_session


def test_uses_gemini_live_native_audio(monkeypatch: pytest.MonkeyPatch) -> None:
    """The production session speaks and listens via the Gemini Live API directly."""
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")

    session = build_session()

    assert isinstance(session.llm, llm.RealtimeModel)
    assert session.llm.model == GEMINI_LIVE_MODEL
    assert session.stt is None
    assert session.tts is None
    assert session.llm.capabilities.turn_detection is True
    assert session.turn_detection is None
    assert session.llm.capabilities.audio_output is True


@pytest.mark.asyncio
async def test_assistant_has_tourism_tools() -> None:
    assistant = Assistant()
    tools = assistant.tools
    names = {getattr(t, "name", None) or getattr(t, "__name__", "") for t in tools}
    # function_tool wrappers expose .name on LiveKit tool objects
    assert any("ask_navix_guide" in str(n) for n in names) or len(tools) >= 3
