import subprocess
import os
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from loguru import logger

supports_format = ['.csv', '.docx', '.epub', '.ipynb',  '.mbox', '.md', '.pdf',  '.txt', '.ppt', '.pptm', '.pptx', '.bat']

EXTRACT_TIMEOUT = 30  # 单个提取方法的超时时间（秒）

def convert_to_markdown(file_path: str) -> str:
    """
    将支持的文件格式转换为Markdown格式
    Args:
        file_path: 输入文件路径
    Returns:
        str: 转换后的Markdown文件路径，如果转换失败则返回原始文件路径
    """
    _, ext = os.path.splitext(file_path.lower())

    if ext in ['.docx', '.doc', '.pptx', '.ppt', '.pptm', '.xls', '.xlsx', '.csv', 'pdf']:
        try:
            # 创建输出Markdown文件路径
            md_path = os.path.splitext(file_path)[0] + '.md'
            # 使用markitdown工具将文件转换为Markdown
            command = f"markitdown {file_path} > {md_path}"
            subprocess.run(command, shell=True, check=True)
            print(f"已将{ext}文件转换为Markdown: {md_path}")
            return md_path
        except Exception as e:
            print(f"{ext}转Markdown失败: {str(e)}，将继续处理原文件")
            return file_path

    return file_path

def _extract_pdf_text_with_pymupdf(file_path: str) -> str:
    import fitz

    chunks = []
    with fitz.open(file_path) as doc:
        for page in doc:
            chunks.append(page.get_text("text"))
    return '\n'.join(chunks).strip()


def _extract_pdf_text_with_pypdf2(file_path: str) -> str:
    import PyPDF2

    reader = PyPDF2.PdfReader(file_path)
    chunks = []
    for page in reader.pages:
        chunks.append(page.extract_text() or "")
    return '\n'.join(chunks).strip()


def _extract_plain_text(file_path: str) -> str:
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read().strip()


def _run_with_timeout(func, *args, timeout=EXTRACT_TIMEOUT):
    """带超时的函数执行"""
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(func, *args)
        return future.result(timeout=timeout)


# 修改后的 extract_text 函数，结合 SimpleDirectoryReader 和自定义解析逻辑
def extract_text(file_path):
    _, ext = os.path.splitext(file_path.lower())

    errors = []

    # PDF: 优先用轻量级的 pymupdf / pypdf2（快），SimpleDirectoryReader 作为兜底
    if ext == '.pdf':
        for fallback in (_extract_pdf_text_with_pymupdf, _extract_pdf_text_with_pypdf2):
            try:
                content = _run_with_timeout(fallback, file_path)
                if content:
                    return content
                else:
                    errors.append(f"{fallback.__name__}: 提取结果为空")
            except FuturesTimeoutError:
                logger.warning(f"{fallback.__name__} 超时({EXTRACT_TIMEOUT}s)")
                errors.append(f"{fallback.__name__}: 超时")
            except Exception as e:
                logger.warning(f"{fallback.__name__} 提取失败: {e}")
                errors.append(f"{fallback.__name__}: {e}")

    # 纯文本类文件直接读取
    if ext in ['.txt', '.md', '.csv', '.bat']:
        try:
            content = _extract_plain_text(file_path)
            if content:
                return content
        except Exception as e:
            logger.warning(f"纯文本提取失败: {e}")
            errors.append(f"纯文本提取: {e}")

    # 其他格式或上面未成功：用 SimpleDirectoryReader 兜底（带超时）
    if ext in supports_format:
        try:
            from llama_index.core import SimpleDirectoryReader
            def _load():
                reader = SimpleDirectoryReader(input_files=[file_path])
                return reader.load_data()
            logger.info(f"Extracting text from {file_path} using SimpleDirectoryReader")
            documents = _run_with_timeout(_load, timeout=EXTRACT_TIMEOUT)
            logger.info(f"Complete: Extracting text from {file_path} using SimpleDirectoryReader")
            buffer = [doc.text for doc in documents]
            joined = '\n'.join(buffer).strip()
            if joined:
                return joined
            else:
                errors.append("SimpleDirectoryReader: 提取结果为空")
        except FuturesTimeoutError:
            logger.warning(f"SimpleDirectoryReader 超时({EXTRACT_TIMEOUT}s)")
            errors.append(f"SimpleDirectoryReader: 超时({EXTRACT_TIMEOUT}s)")
        except Exception as e:
            logger.warning(f"SimpleDirectoryReader 提取失败: {e}")
            errors.append(f"SimpleDirectoryReader: {e}")

    if ext not in supports_format:
        return '格式不支持'

    if errors:
        logger.error(f"文件 {file_path} 所有提取方式均失败: {'; '.join(errors)}")

    return ""
