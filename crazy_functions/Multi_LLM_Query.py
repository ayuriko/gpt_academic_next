from toolbox import CatchException, update_ui, get_conf
from crazy_functions.crazy_utils import request_gpt_model_in_new_thread_with_ui_alive
from shared_utils.doc_loader_dynamic import contain_uploaded_files, load_uploaded_files
import os
import datetime

DEFAULT_MULTI_QUERY_MODELS = "gpt-5.4&deepseek-reasoner"
LEGACY_MULTI_QUERY_MODELS = {
    "gpt-3.5-turbo&chatglm3",
    "chatglm3&gpt-3.5-turbo",
}


def resolve_multi_query_models(preferred: str | None = None):
    models = (preferred or get_conf('MULTI_QUERY_LLM_MODELS') or "").strip()
    if not models or models in LEGACY_MULTI_QUERY_MODELS:
        return DEFAULT_MULTI_QUERY_MODELS
    return models


def prepare_multi_query_inputs(txt, llm_kwargs, plugin_kwargs, chatbot, history, system_prompt):
    attached_upload_path = (llm_kwargs.get("attached_upload_path") or "").strip()

    if attached_upload_path and os.path.exists(attached_upload_path):
        synthetic_inputs = txt.strip()
        if attached_upload_path not in synthetic_inputs:
            synthetic_inputs = f"{attached_upload_path}\n{synthetic_inputs}".strip() if synthetic_inputs else attached_upload_path
        return (yield from load_uploaded_files(
            synthetic_inputs, None, llm_kwargs, plugin_kwargs,
            chatbot, history, system_prompt, True, None
        ))

    if contain_uploaded_files(txt):
        return (yield from load_uploaded_files(
            txt, None, llm_kwargs, plugin_kwargs,
            chatbot, history, system_prompt, True, None
        ))

    return txt

@CatchException
def 同时问询(txt, llm_kwargs, plugin_kwargs, chatbot, history, system_prompt, user_request):
    """
    txt             输入栏用户输入的文本，例如需要翻译的一段话，再例如一个包含了待处理文件的路径
    llm_kwargs      gpt模型参数，如温度和top_p等，一般原样传递下去就行
    plugin_kwargs   插件模型的参数，用于灵活调整复杂功能的各种参数
    chatbot         聊天显示框的句柄，用于显示给用户
    history         聊天历史，前情提要
    system_prompt   给gpt的静默提醒
    user_request    当前用户的请求信息（IP地址等）
    """
    history = []    # 清空历史，以免输入溢出
    effective_txt = yield from prepare_multi_query_inputs(txt, llm_kwargs, plugin_kwargs, chatbot, history, system_prompt)
    if not effective_txt:
        return
    display_txt = txt.strip()
    if not display_txt or contain_uploaded_files(display_txt):
        display_txt = effective_txt
    MULTI_QUERY_LLM_MODELS = resolve_multi_query_models()
    chatbot.append((None, "正在同时咨询 " + MULTI_QUERY_LLM_MODELS))
    yield from update_ui(chatbot=chatbot, history=history) # 刷新界面 # 由于请求gpt需要一段时间，我们先及时地做一次界面更新

    # llm_kwargs['llm_model'] = 'gpt-5.4&deepseek-reasoner&gpt-4o' # 支持任意数量的llm接口，用&符号分隔
    llm_kwargs['llm_model'] = MULTI_QUERY_LLM_MODELS # 支持任意数量的llm接口，用&符号分隔
    gpt_say = yield from request_gpt_model_in_new_thread_with_ui_alive(
        inputs=effective_txt, inputs_show_user=display_txt,
        llm_kwargs=llm_kwargs, chatbot=chatbot, history=history,
        sys_prompt=system_prompt,
        retry_times_at_unknown_error=0
    )

    history.append(display_txt)
    history.append(gpt_say)
    yield from update_ui(chatbot=chatbot, history=history) # 刷新界面 # 界面更新


@CatchException
def 同时问询_指定模型(txt, llm_kwargs, plugin_kwargs, chatbot, history, system_prompt, user_request):
    """
    txt             输入栏用户输入的文本，例如需要翻译的一段话，再例如一个包含了待处理文件的路径
    llm_kwargs      gpt模型参数，如温度和top_p等，一般原样传递下去就行
    plugin_kwargs   插件模型的参数，用于灵活调整复杂功能的各种参数
    chatbot         聊天显示框的句柄，用于显示给用户
    history         聊天历史，前情提要
    system_prompt   给gpt的静默提醒
    user_request    当前用户的请求信息（IP地址等）
    """
    history = []    # 清空历史，以免输入溢出
    effective_txt = yield from prepare_multi_query_inputs(txt, llm_kwargs, plugin_kwargs, chatbot, history, system_prompt)
    if not effective_txt:
        return
    display_txt = txt.strip()
    if not display_txt or contain_uploaded_files(display_txt):
        display_txt = effective_txt

    if ("advanced_arg" in plugin_kwargs) and (plugin_kwargs["advanced_arg"] == ""): plugin_kwargs.pop("advanced_arg")
    # llm_kwargs['llm_model'] = 'gpt-5.4&deepseek-reasoner&gpt-4o' # 支持任意数量的llm接口，用&符号分隔
    llm_kwargs['llm_model'] = resolve_multi_query_models(plugin_kwargs.get("advanced_arg")) # 支持任意数量的llm接口，用&符号分隔

    chatbot.append((None, f"正在同时咨询 {llm_kwargs['llm_model']}"))
    yield from update_ui(chatbot=chatbot, history=history) # 刷新界面 # 由于请求gpt需要一段时间，我们先及时地做一次界面更新

    gpt_say = yield from request_gpt_model_in_new_thread_with_ui_alive(
        inputs=effective_txt, inputs_show_user=display_txt,
        llm_kwargs=llm_kwargs, chatbot=chatbot, history=history,
        sys_prompt=system_prompt,
        retry_times_at_unknown_error=0
    )

    history.append(display_txt)
    history.append(gpt_say)
    yield from update_ui(chatbot=chatbot, history=history) # 刷新界面 # 界面更新
