import hashlib
import secrets
from datetime import datetime, timedelta


def generate_refresh_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(48)
    hashed = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, hashed


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_refresh_expiry(days: int = 7) -> datetime:
    return datetime.utcnow() + timedelta(days=days)
