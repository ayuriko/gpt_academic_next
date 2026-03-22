import os
import uuid
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from toolbox import get_conf, ChatBotWithCookies
from request_llms.bridge_all import predict
from api_server.sse_helpers import sse_generator
from api_server.session import session_manager
from crazy_functional import get_crazy_functions

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
    plugin_kwargs: dict = {}
    additional_fn: str | None = None
    session_id: str | None = None
    attached_upload_path: str | None = None


def _resolve_plugin_executor(plugin_name: str):
    plugins = get_crazy_functions()
    plugin = plugins.get(plugin_name)
    if plugin is None:
        raise HTTPException(status_code=404, detail=f"Plugin not found: {plugin_name}")

    if plugin.get("Class") is not None:
        return plugin["Class"].execute

    if plugin.get("Function") is not None:
        return plugin["Function"]

    raise HTTPException(status_code=400, detail=f"Plugin has no executable entry: {plugin_name}")


def _normalize_upload_path(path: str | None) -> str:
    normalized = (path or "").strip()
    if not normalized:
        return ""
    return normalized if os.path.isabs(normalized) else os.path.abspath(normalized)


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    API_KEY, EMBEDDING_MODEL = get_conf("API_KEY", "EMBEDDING_MODEL")
    session_id, session_cookie = session_manager.get_or_create(req.session_id)
    attached_upload_path = _normalize_upload_path(req.attached_upload_path)
    most_recent_uploaded = dict(session_cookie.get("most_recent_uploaded") or {})
    if most_recent_uploaded.get("path"):
        most_recent_uploaded["path"] = _normalize_upload_path(most_recent_uploaded.get("path"))
    if most_recent_uploaded.get("source_paths"):
        most_recent_uploaded["source_paths"] = [
            _normalize_upload_path(path) for path in most_recent_uploaded.get("source_paths", [])
        ]

    # Build llm_kwargs
    llm_kwargs = {
        "api_key": API_KEY,
        "llm_model": req.llm_model,
        "embed_model": EMBEDDING_MODEL,
        "top_p": req.top_p,
        "temperature": req.temperature,
        "max_length": req.max_length,
        "most_recent_uploaded": most_recent_uploaded,
        "attached_upload_path": attached_upload_path,
    }

    # Build plugin_kwargs
    plugin_kwargs = dict(req.plugin_kwargs or {})

    # Build chatbot with cookies
    cookie = {
        **session_cookie,
        "api_key": API_KEY,
        "llm_model": req.llm_model,
        "embed_model": EMBEDDING_MODEL,
        "top_p": req.top_p,
        "temperature": req.temperature,
        "max_length": req.max_length,
        "uuid": session_cookie.get("uuid", uuid.uuid4()),
    }
    chatbot = ChatBotWithCookies(cookie)

    # Build history
    history = req.history

    main_input = req.message.strip()
    if req.plugin_name and not main_input:
        main_input = attached_upload_path or most_recent_uploaded.get("path", "")

    if req.plugin_name:
        executor = _resolve_plugin_executor(req.plugin_name)
        gen = executor(
            main_input,
            llm_kwargs,
            plugin_kwargs,
            chatbot,
            history,
            req.system_prompt,
            None,
        )
    else:
        gen = predict(
            inputs=main_input,
            llm_kwargs=llm_kwargs,
            plugin_kwargs=plugin_kwargs,
            chatbot=chatbot,
            history=history,
            system_prompt=req.system_prompt,
            stream=True,
            additional_fn=req.additional_fn,
        )

    return sse_generator(gen, session_id=session_id)
