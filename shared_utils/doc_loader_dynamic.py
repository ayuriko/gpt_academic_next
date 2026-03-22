import re
import os
from toolbox import get_conf


def start_with_url(inputs:str):
    """
    检查输入是否以 http:// 或 https:// 开头，且为有效的网址
    """
    if not ("http://" in inputs or "https://" in inputs):
        return False
    try:
        text = inputs.strip(',.!?，。！？ \t\n\r')
        words = text.split()
        if len(words) != 1:
            return False
        from urllib.parse import urlparse
        result = urlparse(text)
        return all([result.scheme, result.netloc])
    except:
        return False

def load_web_content(inputs:str, chatbot_with_cookie, history:list):
    from crazy_functions.doc_fns.read_fns.web_reader import WebTextExtractor, WebExtractorConfig
    from toolbox import update_ui

    extractor = WebTextExtractor(WebExtractorConfig())
    try:
        # 添加正在处理的提示信息
        chatbot_with_cookie.append([None, "正在提取网页内容，请稍作等待..."])
        yield from update_ui(chatbot=chatbot_with_cookie, history=history)
        web_content = extractor.extract_text(inputs)
        # 移除提示信息
        chatbot_with_cookie.pop()
        # 显示提取的内容
        chatbot_with_cookie.append([None, f"网页{inputs}的文本内容如下：" + web_content])
        history.extend([f"网页{inputs}的文本内容如下：" + web_content])
        yield from update_ui(chatbot=chatbot_with_cookie, history=history)
    except Exception as e:
        # 如果出错，移除提示信息（如果存在）
        if len(chatbot_with_cookie) > 0 and chatbot_with_cookie[-1][-1] == "正在提取网页内容，请稍作等待...":
            chatbot_with_cookie.pop()
        chatbot_with_cookie.append([inputs, f"网页内容提取失败: {str(e)}"])
        yield from update_ui(chatbot=chatbot_with_cookie, history=history)

def extract_file_path(text):
    raw_base_path = get_conf("PATH_PRIVATE_UPLOAD").replace("\\", "/").rstrip("/")
    absolute_base_path = os.path.abspath(get_conf("PATH_PRIVATE_UPLOAD")).replace("\\", "/").rstrip("/")
    normalized_text = text.replace("\\", "/")

    for base_path in [absolute_base_path, raw_base_path]:
        if not base_path:
            continue
        for match in re.finditer(re.escape(base_path), normalized_text):
            start = match.start()
            for end in range(len(normalized_text), start + len(base_path) - 1, -1):
                candidate = normalized_text[start:end].strip(" \t\r\n`'\"，。！？,.;:()[]{}<>")
                if candidate and os.path.exists(candidate):
                    return candidate
    return None

def contain_uploaded_files(inputs: str):
    file_path_match = extract_file_path(inputs)
    if file_path_match:
        return True
    return False


def load_uploaded_files(inputs, method, llm_kwargs, plugin_kwargs, chatbot_with_cookie, history, system_prompt, stream, additional_fn):
    # load file
    from crazy_functions.doc_fns.text_content_loader import TextContentLoader
    file_path = extract_file_path(inputs)
    loader = TextContentLoader(chatbot_with_cookie, history)
    if os.path.isfile(file_path):
        yield from loader.execute_single_file(file_path)
    else:
        yield from loader.execute(file_path)

    if not loader.latest_llm_content:
        return None

    # get question
    original_question = inputs.replace(file_path, '').strip()
    if not original_question:
        original_question = f"请简单分析上述文件内容"
    else:
        original_question = f"基于上述文件内容，{original_question}"

    return original_question
