from pydantic import BaseModel


class ItemAssignmentResponse(BaseModel):
    user_id: str
    assigned_amount: float

    class Config:
        from_attributes = True


class ReceiptItemResponse(BaseModel):
    id: str
    name: str
    quantity: float
    unit_price: float
    total_price: float
    display_order: int
    is_tax_line: bool
    is_tip_line: bool
    is_taxable: bool
    tax_rate: float
    discount_amount: float
    assignments: list[ItemAssignmentResponse] = []

    class Config:
        from_attributes = True


class ReceiptResponse(BaseModel):
    id: str
    ocr_status: str
    merchant_name: str | None
    ocr_total: float | None
    image_url: str
    items: list[ReceiptItemResponse] = []

    class Config:
        from_attributes = True


class UpdateReceiptItemRequest(BaseModel):
    name: str | None = None
    quantity: float | None = None
    unit_price: float | None = None
    total_price: float | None = None
    is_taxable: bool | None = None
    tax_rate: float | None = None
    discount_amount: float | None = None


class AssignItemRequest(BaseModel):
    receipt_item_id: str
    user_ids: list[str]  # split equally among these users


class CreateExpenseFromReceiptRequest(BaseModel):
    receipt_id: str
    description: str
    paid_by: str
    group_id: str | None = None
    assignments: list[AssignItemRequest]
