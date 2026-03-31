import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Numeric, String, Boolean, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    receipt_id = Column(UUID(as_uuid=True), ForeignKey("receipts.id"), nullable=True)
    paid_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    description = Column(String, nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    split_method = Column(Enum("equal", "exact", "percentage", "itemized", name="split_method"), nullable=False)
    date = Column(Date, nullable=False, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    payer = relationship("User", foreign_keys=[paid_by])
    receipt = relationship("Receipt", foreign_keys=[receipt_id])
    creator = relationship("User", foreign_keys=[created_by])
    group = relationship("Group", foreign_keys=[group_id])
    participants = relationship("ExpenseParticipant", back_populates="expense", cascade="all, delete-orphan")


class ExpenseParticipant(Base):
    __tablename__ = "expense_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    owed_amount = Column(Numeric(12, 2), nullable=False)
    is_settled = Column(Boolean, default=False)

    expense = relationship("Expense", back_populates="participants")
    user = relationship("User", foreign_keys=[user_id])


class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    payer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    payee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    payer = relationship("User", foreign_keys=[payer_id])
    payee = relationship("User", foreign_keys=[payee_id])
    group = relationship("Group", foreign_keys=[group_id])
