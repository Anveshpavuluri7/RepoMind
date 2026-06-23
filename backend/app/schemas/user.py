from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    github_login: str
    name: str | None = None
    email: str | None = None
    avatar_url: str | None = None


class UserResponse(UserBase):
    id: UUID
    github_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMe(UserResponse):
    pass
