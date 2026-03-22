import asyncio
import edge_tts
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from toolbox import get_conf

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    voice: str | None = None


@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    TTS_TYPE = get_conf("TTS_TYPE")

    if TTS_TYPE == "DISABLE":
        return {"error": "TTS is disabled"}

    voice = req.voice or get_conf("EDGE_TTS_VOICE") or "zh-CN-XiaoxiaoNeural"
    text = req.text[:3000]  # limit length

    communicate = edge_tts.Communicate(text, voice)

    async def audio_stream():
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=tts.mp3"},
    )
