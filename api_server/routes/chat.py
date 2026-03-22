import importlib
import os
import re
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


def _has_meaningful_plugin_kwargs(plugin_kwargs: dict | None) -> bool:
    if not plugin_kwargs:
        return False
    for value in plugin_kwargs.values():
        if isinstance(value, str):
            if value.strip():
                return True
        elif value is not None:
            return True
    return False


def _resolve_plugin_executor(plugin_name: str, plugin_kwargs: dict | None = None):
    plugins = get_crazy_functions()
    plugin = plugins.get(plugin_name)
    if plugin is None:
        raise HTTPException(status_code=404, detail=f"Plugin not found: {plugin_name}")

    # 对新旧双入口并存的插件，只有当前端确实提交了插件参数时才优先走 Class.execute。
    # 这样像“Arxiv论文翻译”这类按钮式插件仍可沿用旧的函数式主输入体验。
    if plugin.get("Class") is not None and _has_meaningful_plugin_kwargs(plugin_kwargs):
        return plugin["Class"].execute

    if plugin.get("Function") is not None:
        return plugin["Function"]

    if plugin.get("Class") is not None:
        return plugin["Class"].execute

    raise HTTPException(status_code=400, detail=f"Plugin has no executable entry: {plugin_name}")


def _resolve_locked_executor(callback_path: str):
    normalized = (callback_path or "").strip()
    if not normalized or "->" not in normalized:
        raise HTTPException(status_code=400, detail=f"Invalid locked plugin callback: {callback_path}")

    module_name, fn_name = normalized.split("->", 1)
    module = importlib.import_module(module_name)
    executor = getattr(module, fn_name, None)
    if executor is None:
        raise HTTPException(status_code=404, detail=f"Locked plugin callback not found: {callback_path}")
    return executor


def _normalize_upload_path(path: str | None) -> str:
    normalized = (path or "").strip()
    if not normalized:
        return ""
    return normalized if os.path.isabs(normalized) else os.path.abspath(normalized)


def _looks_like_explicit_resource(value: str) -> bool:
    text = (value or "").strip()
    if not text:
        return False
    if text.startswith(("http://", "https://", "file://", "/")):
        return True
    if text.startswith("./") or text.startswith("../") or text.startswith("~/"):
        return True
    if "\\" in text or "/" in text:
        return True
    return re.match(r"^[A-Za-z]:[\\/]", text) is not None


def _should_use_uploaded_path(plugin_name: str | None, main_input: str, attached_upload_path: str) -> bool:
    if not plugin_name or not attached_upload_path:
        return False

    plugin = get_crazy_functions().get(plugin_name) or {}
    info = str(plugin.get("Info") or "")
    path_markers = (
        "输入参数为路径",
        "输入参数是路径",
        "输入参数为文件路径",
        "输入参数为论文路径",
        "路径或上传压缩包",
        "路径或URL",
        "路径或DOI",
        "路径或doi",
        "上传压缩包",
    )
    expects_path_like_input = any(marker in info for marker in path_markers)
    if not expects_path_like_input:
        return False

    return not _looks_like_explicit_resource(main_input)


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
    elif _should_use_uploaded_path(req.plugin_name, main_input, attached_upload_path):
        main_input = attached_upload_path

    locked_plugin = (session_cookie.get("lock_plugin") or "").strip()
    if req.plugin_name:
        executor = _resolve_plugin_executor(req.plugin_name, plugin_kwargs)
        gen = executor(
            main_input,
            llm_kwargs,
            plugin_kwargs,
            chatbot,
            history,
            req.system_prompt,
            None,
        )
    elif locked_plugin:
        executor = _resolve_locked_executor(locked_plugin)
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
