import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.bill_split import BillSplit
from app.models.user import User

router = APIRouter(prefix="/bill-splits", tags=["bill-splits"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class BillSplitCreate(BaseModel):
    title: Optional[str] = None
    state: dict  # full frontend state as JSON object


class BillSplitUpdate(BaseModel):
    title: Optional[str] = None
    state: Optional[dict] = None


class BillSplitResponse(BaseModel):
    id: str
    title: Optional[str]
    state: dict
    created_at: str
    updated_at: str


def _to_response(bs: BillSplit) -> BillSplitResponse:
    import json
    return BillSplitResponse(
        id=str(bs.id),
        title=bs.title,
        state=json.loads(bs.state_json),
        created_at=bs.created_at.isoformat() if bs.created_at else "",
        updated_at=bs.updated_at.isoformat() if bs.updated_at else "",
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/", response_model=BillSplitResponse, status_code=201)
def create_bill_split(
    body: BillSplitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import json
    bs = BillSplit(
        owner_id=current_user.id,
        title=body.title,
        state_json=json.dumps(body.state),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(bs)
    db.commit()
    db.refresh(bs)
    return _to_response(bs)


@router.get("/", response_model=List[BillSplitResponse])
def list_bill_splits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    splits = (
        db.query(BillSplit)
        .filter(BillSplit.owner_id == current_user.id)
        .order_by(BillSplit.updated_at.desc())
        .all()
    )
    return [_to_response(bs) for bs in splits]


@router.get("/{split_id}", response_model=BillSplitResponse)
def get_bill_split(
    split_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        split_uuid = uuid.UUID(split_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="Invalid split id")

    bs = db.query(BillSplit).filter(
        BillSplit.id == split_uuid,
        BillSplit.owner_id == current_user.id,
    ).first()
    if not bs:
        raise HTTPException(status_code=404, detail="Bill split not found")
    return _to_response(bs)


@router.put("/{split_id}", response_model=BillSplitResponse)
def update_bill_split(
    split_id: str,
    body: BillSplitUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import json
    try:
        split_uuid = uuid.UUID(split_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="Invalid split id")

    bs = db.query(BillSplit).filter(
        BillSplit.id == split_uuid,
        BillSplit.owner_id == current_user.id,
    ).first()
    if not bs:
        raise HTTPException(status_code=404, detail="Bill split not found")

    if body.title is not None:
        bs.title = body.title
    if body.state is not None:
        bs.state_json = json.dumps(body.state)
    bs.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(bs)
    return _to_response(bs)


@router.delete("/{split_id}", status_code=204)
def delete_bill_split(
    split_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        split_uuid = uuid.UUID(split_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="Invalid split id")

    bs = db.query(BillSplit).filter(
        BillSplit.id == split_uuid,
        BillSplit.owner_id == current_user.id,
    ).first()
    if not bs:
        raise HTTPException(status_code=404, detail="Bill split not found")

    db.delete(bs)
    db.commit()
