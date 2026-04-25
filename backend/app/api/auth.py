from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    username: str
    role: str
    token: str


USERS = {
    "admin": {"password": "admin123", "role": "admin"},
    "planner": {"password": "planner123", "role": "planner"},
    "viewer": {"password": "viewer123", "role": "viewer"},
}


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    user = USERS.get(payload.username)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return {
        "username": payload.username,
        "role": user["role"],
        "token": f"local-{payload.username}-{user['role']}",
    }
