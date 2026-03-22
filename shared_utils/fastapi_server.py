"""
Path safety validation utility.
Extracted from the legacy fastapi_server.py for use by plugins.
"""
import os


def validate_path_safety(path: str, allowed_base: str = None) -> bool:
    """
    Validate that a path doesn't escape allowed directories.
    Returns True if path is safe, False otherwise.
    """
    if not path:
        return False

    # Normalize path
    normalized = os.path.normpath(path)

    # Block path traversal attempts
    if ".." in normalized.split(os.sep):
        return False

    # If allowed_base specified, ensure path is within it
    if allowed_base:
        abs_path = os.path.abspath(normalized)
        abs_base = os.path.abspath(allowed_base)
        if not abs_path.startswith(abs_base):
            return False

    return True
