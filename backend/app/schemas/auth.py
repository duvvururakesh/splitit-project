from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    phone_number: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


from pydantic import field_validator
import uuid as _uuid

class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    phone_number: str | None = None
    avatar_url: str | None = None

    model_config = {"from_attributes": True}

    @field_validator('id', mode='before')
    @classmethod
    def coerce_id(cls, v):
        return str(v)
