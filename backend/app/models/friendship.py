import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    addressee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(Enum("pending", "accepted", name="friendship_status"), default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    requester = relationship("User", foreign_keys=[requester_id])
    addressee = relationship("User", foreign_keys=[addressee_id])

    __table_args__ = (UniqueConstraint("requester_id", "addressee_id", name="uq_friendship"),)
