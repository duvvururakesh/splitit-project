import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    image_path = Column(String, nullable=False)       # local file path
    ocr_status = Column(
        Enum("pending", "processing", "completed", "failed", name="ocr_status"),
        default="pending",
        nullable=False,
    )
    merchant_name = Column(String, nullable=True)
    ocr_total = Column(Numeric(12, 2), nullable=True)  # total as read from receipt
    created_at = Column(DateTime, default=datetime.utcnow)

    uploader = relationship("User", foreign_keys=[uploader_id])
    items = relationship("ReceiptItem", back_populates="receipt", cascade="all, delete-orphan")


class ReceiptItem(Base):
    __tablename__ = "receipt_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_id = Column(UUID(as_uuid=True), ForeignKey("receipts.id"), nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(Numeric(8, 2), default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)
    total_price = Column(Numeric(12, 2), nullable=False)
    display_order = Column(Integer, default=0)
    is_tax_line = Column(Boolean, default=False)
    is_tip_line = Column(Boolean, default=False)
    is_taxable = Column(Boolean, default=False)
    tax_rate = Column(Numeric(6, 4), default=0)      # e.g. 8.5 = 8.5%
    discount_amount = Column(Numeric(12, 2), default=0)  # flat $ off this item

    receipt = relationship("Receipt", back_populates="items")
    assignments = relationship("ReceiptItemAssignment", back_populates="item", cascade="all, delete-orphan")


class ReceiptItemAssignment(Base):
    __tablename__ = "receipt_item_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_item_id = Column(UUID(as_uuid=True), ForeignKey("receipt_items.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_amount = Column(Numeric(12, 2), nullable=False)

    item = relationship("ReceiptItem", back_populates="assignments")
    user = relationship("User", foreign_keys=[user_id])
