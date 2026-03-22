from fastapi import APIRouter
from pydantic import BaseModel
from toolbox import get_conf

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
async def login(req: LoginRequest):
    AUTHENTICATION = get_conf("AUTHENTICATION")
    if not AUTHENTICATION:
        return {"token": "no-auth-required", "username": "default"}

    for user, pwd in AUTHENTICATION:
        if req.username == user and req.password == pwd:
            import uuid
            token = uuid.uuid4().hex
            return {"token": token, "username": user}

    return {"error": "用户名或密码错误"}, 401


@router.get("/auth/check")
async def check_auth():
    AUTHENTICATION = get_conf("AUTHENTICATION")
    return {"auth_required": len(AUTHENTICATION) > 0}
