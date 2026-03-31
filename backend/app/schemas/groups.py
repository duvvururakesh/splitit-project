from pydantic import BaseModel
from app.schemas.auth import UserResponse


class CreateGroupRequest(BaseModel):
    name: str
    description: str | None = None


class AddMemberRequest(BaseModel):
    email: str


class GroupMemberResponse(BaseModel):
    id: str
    user: UserResponse
    joined_at: str

    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    id: str
    name: str
    description: str | None
    avatar_url: str | None
    created_by: str
    member_count: int = 0
    balance: float = 0.0  # your net balance in this group

    class Config:
        from_attributes = True


class GroupDetailResponse(GroupResponse):
    members: list[GroupMemberResponse] = []
