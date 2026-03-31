from pydantic import BaseModel, EmailStr


class FriendRequest(BaseModel):
    email: EmailStr


class FriendUserResponse(BaseModel):
    id: str
    display_name: str
    email: str
    avatar_url: str | None
    balance: float = 0.0  # positive = they owe you, negative = you owe them

    class Config:
        from_attributes = True


class FriendshipResponse(BaseModel):
    id: str
    status: str
    friend: FriendUserResponse

    class Config:
        from_attributes = True
