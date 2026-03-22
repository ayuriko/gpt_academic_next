import os
from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter()


@router.get("/files/{path:path}")
async def serve_file(path: str):
    # Prevent path traversal
    clean = os.path.normpath(path)
    if clean.startswith("..") or clean.startswith("/"):
        return {"error": "Invalid path"}, 403

    if not os.path.isfile(clean):
        return {"error": "File not found"}, 404

    return FileResponse(clean)
