from datetime import date as date_type, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.expense import Expense, ExpenseParticipant, Settlement
from app.models.group import GroupMember
from app.models.user import User
from app.schemas.expenses import (
    BalanceEntry,
    CreateExpenseRequest,
    CreateSettlementRequest,
    ExpenseResponse,
    ParticipantResponse,
    SettlementResponse,
    UpdateExpenseRequest,
)
from app.services.balance import get_balances_for_user

router = APIRouter(prefix="/expenses", tags=["expenses"])
settlements_router = APIRouter(prefix="/settlements", tags=["settlements"])


def _expense_to_response(expense: Expense) -> ExpenseResponse:
    return ExpenseResponse(
        id=str(expense.id),
        description=expense.description,
        total_amount=float(expense.total_amount),
        currency=expense.currency,
        split_method=expense.split_method,
        paid_by=str(expense.paid_by),
        paid_by_name=expense.payer.display_name,
        group_id=str(expense.group_id) if expense.group_id else None,
        receipt_id=str(expense.receipt_id) if expense.receipt_id else None,
        date=expense.date.isoformat(),
        notes=expense.notes,
        participants=[
            ParticipantResponse(
                user_id=str(p.user_id),
                display_name=p.user.display_name,
                owed_amount=float(p.owed_amount),
                is_settled=p.is_settled,
            )
            for p in expense.participants
        ],
        created_at=expense.created_at.isoformat(),
    )


@router.post("/", response_model=ExpenseResponse, status_code=201)
def create_expense(body: CreateExpenseRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Validate group membership if group expense
    if body.group_id:
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == body.group_id,
            GroupMember.user_id == current_user.id,
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="You are not in this group")

    expense = Expense(
        group_id=body.group_id,
        paid_by=body.paid_by,
        description=body.description,
        total_amount=Decimal(str(body.total_amount)),
        split_method=body.split_method,
        date=body.date or date_type.today(),
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(expense)
    db.flush()

    total = Decimal(str(body.total_amount))

    if body.split_method == "equal":
        ids = body.participant_ids or [str(current_user.id)]
        share = total / len(ids)
        for uid in ids:
            db.add(ExpenseParticipant(expense_id=expense.id, user_id=uid, owed_amount=share))

    elif body.split_method == "exact":
        for p in body.participants:
            db.add(ExpenseParticipant(expense_id=expense.id, user_id=p.user_id, owed_amount=Decimal(str(p.amount))))

    elif body.split_method == "percentage":
        for p in body.participants:
            amount = total * Decimal(str(p.amount)) / 100
            db.add(ExpenseParticipant(expense_id=expense.id, user_id=p.user_id, owed_amount=amount))

    db.commit()
    db.refresh(expense)
    return _expense_to_response(expense)


@router.get("/", response_model=list[ExpenseResponse])
def list_expenses(
    group_id: str | None = None,
    with_user_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.expense import ExpenseParticipant as EP
    query = db.query(Expense).filter(Expense.deleted_at.is_(None))

    if group_id:
        query = query.filter(Expense.group_id == group_id)
    else:
        # All expenses the current user is part of
        my_expense_ids = db.query(EP.expense_id).filter(EP.user_id == current_user.id).subquery()
        query = query.filter(
            (Expense.paid_by == current_user.id) | (Expense.id.in_(my_expense_ids))
        )

    if with_user_id:
        # Further filter: other user must also be a participant (or payer)
        try:
            import uuid
            other_uuid = uuid.UUID(with_user_id)
        except ValueError:
            return []
        other_expense_ids = db.query(EP.expense_id).filter(EP.user_id == other_uuid).subquery()
        query = query.filter(
            (Expense.paid_by == other_uuid) | (Expense.id.in_(other_expense_ids))
        )

    return [_expense_to_response(e) for e in query.order_by(Expense.date.desc()).all()]


# --- Balances --- (must be before /{expense_id} to avoid route conflict)

@router.get("/balances/me", response_model=list[BalanceEntry])
def my_balances(
    group_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    balances = get_balances_for_user(str(current_user.id), db, group_id)
    result = []
    for uid, balance in balances.items():
        if abs(balance) < 0.01:
            continue
        user = db.query(User).filter(User.id == uid).first()
        if user:
            result.append(BalanceEntry(
                user_id=uid,
                display_name=user.display_name,
                avatar_url=user.avatar_url,
                balance=round(balance, 2),
            ))
    return result


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(expense_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.deleted_at.is_(None)).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return _expense_to_response(expense)


@router.patch("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: str,
    body: UpdateExpenseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.deleted_at.is_(None)).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if body.description is not None:
        expense.description = body.description
    if body.total_amount is not None:
        expense.total_amount = Decimal(str(body.total_amount))
    if body.paid_by is not None:
        expense.paid_by = body.paid_by
    if body.group_id is not None:
        expense.group_id = body.group_id
    if body.date is not None:
        expense.date = body.date
    if body.notes is not None:
        expense.notes = body.notes
    if body.split_method is not None:
        expense.split_method = body.split_method

    # If participants provided, replace them
    if body.participants is not None or body.participant_ids is not None:
        db.query(ExpenseParticipant).filter(ExpenseParticipant.expense_id == expense.id).delete()
        total = Decimal(str(body.total_amount or expense.total_amount))
        split = body.split_method or expense.split_method

        if split == "equal":
            ids = body.participant_ids or []
            if ids:
                share = total / len(ids)
                for uid in ids:
                    db.add(ExpenseParticipant(expense_id=expense.id, user_id=uid, owed_amount=share))
        else:
            for p in (body.participants or []):
                amount = (
                    total * Decimal(str(p.amount)) / 100
                    if split == "percentage"
                    else Decimal(str(p.amount))
                )
                db.add(ExpenseParticipant(expense_id=expense.id, user_id=p.user_id, owed_amount=amount))

    db.commit()
    db.refresh(expense)
    return _expense_to_response(expense)


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.deleted_at.is_(None)).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    expense.deleted_at = datetime.utcnow()
    db.commit()


# --- Settlements ---

@settlements_router.post("/", response_model=SettlementResponse, status_code=201)
def create_settlement(
    body: CreateSettlementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import uuid as _uuid
    payer_uuid = _uuid.UUID(body.payer_id) if body.payer_id else current_user.id
    settlement = Settlement(
        group_id=body.group_id,
        payer_id=payer_uuid,
        payee_id=body.payee_id,
        amount=Decimal(str(body.amount)),
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(settlement)
    db.commit()
    db.refresh(settlement)
    return SettlementResponse(
        id=str(settlement.id),
        payer_id=str(settlement.payer_id),
        payer_name=settlement.payer.display_name,
        payee_id=str(settlement.payee_id),
        payee_name=settlement.payee.display_name,
        amount=float(settlement.amount),
        group_id=str(settlement.group_id) if settlement.group_id else None,
        created_at=settlement.created_at.isoformat(),
    )


@settlements_router.get("/", response_model=list[SettlementResponse])
def list_settlements(
    group_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy import or_
    query = db.query(Settlement).filter(
        or_(Settlement.payer_id == current_user.id, Settlement.payee_id == current_user.id)
    )
    if group_id:
        query = query.filter(Settlement.group_id == group_id)
    settlements = query.order_by(Settlement.created_at.desc()).all()
    return [
        SettlementResponse(
            id=str(s.id),
            payer_id=str(s.payer_id),
            payer_name=s.payer.display_name,
            payee_id=str(s.payee_id),
            payee_name=s.payee.display_name,
            amount=float(s.amount),
            group_id=str(s.group_id) if s.group_id else None,
            created_at=s.created_at.isoformat(),
        )
        for s in settlements
    ]
