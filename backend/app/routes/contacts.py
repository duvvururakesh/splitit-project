import json
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.contact import UserContact, UserContactGroup
from app.models.user import User

router = APIRouter(prefix="/contacts", tags=["contacts"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ContactResponse(BaseModel):
    id: str
    name: str
    note: Optional[str] = None

class ContactCreate(BaseModel):
    name: str
    note: Optional[str] = None

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    note: Optional[str] = None

class GroupResponse(BaseModel):
    id: str
    name: str
    member_ids: List[str]

class GroupCreate(BaseModel):
    name: str
    member_ids: List[str]

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    member_ids: Optional[List[str]] = None


def _contact_to_resp(c: UserContact) -> ContactResponse:
    return ContactResponse(id=str(c.id), name=c.name, note=c.note)

def _group_to_resp(g: UserContactGroup) -> GroupResponse:
    return GroupResponse(id=str(g.id), name=g.name, member_ids=json.loads(g.member_ids_json or "[]"))


# ─── Contacts ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ContactResponse])
def list_contacts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [_contact_to_resp(c) for c in db.query(UserContact).filter(UserContact.owner_id == current_user.id).order_by(UserContact.created_at).all()]

@router.post("/", response_model=ContactResponse, status_code=201)
def create_contact(body: ContactCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    c = UserContact(owner_id=current_user.id, name=body.name.strip(), note=body.note)
    db.add(c); db.commit(); db.refresh(c)
    return _contact_to_resp(c)

@router.patch("/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: str, body: ContactUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(UserContact).filter(UserContact.id == uuid.UUID(contact_id), UserContact.owner_id == current_user.id).first()
    if not c: raise HTTPException(status_code=404, detail="Contact not found")
    if body.name is not None: c.name = body.name.strip()
    if body.note is not None: c.note = body.note
    db.commit(); db.refresh(c)
    return _contact_to_resp(c)

@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(UserContact).filter(UserContact.id == uuid.UUID(contact_id), UserContact.owner_id == current_user.id).first()
    if not c: raise HTTPException(status_code=404, detail="Contact not found")
    # Remove from all groups
    for g in db.query(UserContactGroup).filter(UserContactGroup.owner_id == current_user.id).all():
        ids = json.loads(g.member_ids_json or "[]")
        if contact_id in ids:
            g.member_ids_json = json.dumps([i for i in ids if i != contact_id])
    db.delete(c); db.commit()


# ─── Groups ───────────────────────────────────────────────────────────────────

@router.get("/groups", response_model=List[GroupResponse])
def list_groups(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [_group_to_resp(g) for g in db.query(UserContactGroup).filter(UserContactGroup.owner_id == current_user.id).order_by(UserContactGroup.created_at).all()]

@router.post("/groups", response_model=GroupResponse, status_code=201)
def create_group(body: GroupCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.name.strip(): raise HTTPException(status_code=400, detail="Name is required")
    g = UserContactGroup(owner_id=current_user.id, name=body.name.strip(), member_ids_json=json.dumps(body.member_ids))
    db.add(g); db.commit(); db.refresh(g)
    return _group_to_resp(g)

@router.patch("/groups/{group_id}", response_model=GroupResponse)
def update_group(group_id: str, body: GroupUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    g = db.query(UserContactGroup).filter(UserContactGroup.id == uuid.UUID(group_id), UserContactGroup.owner_id == current_user.id).first()
    if not g: raise HTTPException(status_code=404, detail="Group not found")
    if body.name is not None: g.name = body.name.strip()
    if body.member_ids is not None: g.member_ids_json = json.dumps(body.member_ids)
    db.commit(); db.refresh(g)
    return _group_to_resp(g)

@router.delete("/groups/{group_id}", status_code=204)
def delete_group(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    g = db.query(UserContactGroup).filter(UserContactGroup.id == uuid.UUID(group_id), UserContactGroup.owner_id == current_user.id).first()
    if not g: raise HTTPException(status_code=404, detail="Group not found")
    db.delete(g); db.commit()
