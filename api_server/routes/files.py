import os
from fastapi import APIRouter
from fastapi.responses import FileResponse
from toolbox import get_conf

router = APIRouter()
PATH_PRIVATE_UPLOAD = os.path.abspath(get_conf("PATH_PRIVATE_UPLOAD"))


@router.get("/files/{path:path}")
async def serve_file(path: str):
    clean = os.path.normpath(path)
    candidate = clean if os.path.isabs(clean) else os.path.abspath(clean)
    if not candidate.startswith(PATH_PRIVATE_UPLOAD):
        return {"error": "Invalid path"}, 403

    if not os.path.isfile(candidate):
        return {"error": "File not found"}, 404

    return FileResponse(candidate)
