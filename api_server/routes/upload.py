import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form
from typing import List
from toolbox import get_conf, extract_archive
from api_server.session import session_manager

router = APIRouter()

PATH_PRIVATE_UPLOAD = os.path.abspath(get_conf("PATH_PRIVATE_UPLOAD"))


@router.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    session_id: str | None = Form(None),
):
    upload_id = uuid.uuid4().hex[:8]
    upload_dir = os.path.join(PATH_PRIVATE_UPLOAD, upload_id)
    os.makedirs(upload_dir, exist_ok=True)

    paths = []
    for f in files:
        safe_name = os.path.basename(f.filename or "unnamed")
        dest = os.path.join(upload_dir, safe_name)
        with open(dest, "wb") as out:
            content = await f.read()
            out.write(content)
        extract_archive(dest, dest + ".extract")
        paths.append(dest)

    if session_id:
        _, session = session_manager.get_or_create(session_id)
        session_manager.update_session(session_id, {
            **session,
            "most_recent_uploaded": {
                "path": upload_dir,
                "time": __import__("time").time(),
                "source_paths": paths,
            },
        })

    return {"paths": paths, "upload_dir": upload_dir, "input_path": upload_dir}
