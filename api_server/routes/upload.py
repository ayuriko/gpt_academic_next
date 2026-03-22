import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File
from typing import List
from toolbox import get_conf

router = APIRouter()

PATH_PRIVATE_UPLOAD = get_conf("PATH_PRIVATE_UPLOAD")


@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
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
        paths.append(dest)

    return {"paths": paths, "upload_dir": upload_dir}
