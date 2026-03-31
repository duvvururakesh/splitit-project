from datetime import date as DateType
from pydantic import BaseModel


class ParticipantInput(BaseModel):
    user_id: str
    amount: float  # exact amount or percentage depending on split_method


class CreateExpenseRequest(BaseModel):
    description: str
    total_amount: float
    split_method: str  # equal | exact | percentage
    paid_by: str  # user_id
    group_id: str | None = None
    participant_ids: list[str] = []          # used for equal split
    participants: list[ParticipantInput] = [] # used for exact/percentage
    date: DateType | None = None
    notes: str | None = None


class ParticipantResponse(BaseModel):
    user_id: str
    display_name: str
    owed_amount: float
    is_settled: bool

    class Config:
        from_attributes = True


class ExpenseResponse(BaseModel):
    id: str
    description: str
    total_amount: float
    currency: str
    split_method: str
    paid_by: str
    paid_by_name: str
    group_id: str | None
    receipt_id: str | None
    date: str
    notes: str | None
    participants: list[ParticipantResponse] = []
    created_at: str

    class Config:
        from_attributes = True


class UpdateExpenseRequest(BaseModel):
    description: str | None = None
    total_amount: float | None = None
    split_method: str | None = None
    paid_by: str | None = None
    group_id: str | None = None
    participant_ids: list[str] | None = None         # for equal split
    participants: list[ParticipantInput] | None = None  # for exact/percentage
    date: DateType | None = None
    notes: str | None = None


class CreateSettlementRequest(BaseModel):
    payee_id: str
    amount: float
    payer_id: str | None = None  # optional: defaults to current_user
    group_id: str | None = None
    notes: str | None = None


class SettlementResponse(BaseModel):
    id: str
    payer_id: str
    payer_name: str
    payee_id: str
    payee_name: str
    amount: float
    group_id: str | None
    created_at: str

    class Config:
        from_attributes = True


class BalanceEntry(BaseModel):
    user_id: str
    display_name: str
    avatar_url: str | None
    balance: float  # positive = they owe you, negative = you owe them
