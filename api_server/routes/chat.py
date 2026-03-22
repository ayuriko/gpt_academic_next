import uuid
import threading
from pydantic import BaseModel
from fastapi import APIRouter
from toolbox import get_conf, ChatBotWithCookies
from request_llms.bridge_all import predict
from api_server.sse_helpers import sse_generator
from api_server.session import session_manager

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    history: list[str] = []
    system_prompt: str = "Serve me as a writing and programming assistant."
    llm_model: str = "gpt-5.4"
    top_p: float = 1.0
    temperature: float = 1.0
    max_length: int | None = None
    plugin_name: str | None = None
    additional_fn: str | None = None


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    API_KEY = get_conf("API_KEY")

    # Build llm_kwargs
    llm_kwargs = {
        "api_key": API_KEY,
        "llm_model": req.llm_model,
        "top_p": req.top_p,
        "temperature": req.temperature,
        "max_length": req.max_length,
    }

    # Build plugin_kwargs
    plugin_kwargs = {}

    # Build chatbot with cookies
    cookie = {
        "api_key": API_KEY,
        "llm_model": req.llm_model,
        "uuid": uuid.uuid4(),
    }
    chatbot = ChatBotWithCookies(cookie)

    # Build history
    history = req.history

    # Run predict generator
    gen = predict(
        inputs=req.message,
        llm_kwargs=llm_kwargs,
        plugin_kwargs=plugin_kwargs,
        chatbot=chatbot,
        history=history,
        system_prompt=req.system_prompt,
        stream=True,
        additional_fn=req.additional_fn,
    )

    return sse_generator(gen)
