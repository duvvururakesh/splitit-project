from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.schemas.auth import UserResponse
from app.schemas.groups import (
    AddMemberRequest,
    CreateGroupRequest,
    GroupDetailResponse,
    GroupMemberResponse,
    GroupResponse,
)

router = APIRouter(prefix="/groups", tags=["groups"])


def _group_to_response(group: Group, current_user_id) -> GroupResponse:
    return GroupResponse(
        id=str(group.id),
        name=group.name,
        description=group.description,
        avatar_url=group.avatar_url,
        created_by=str(group.created_by),
        member_count=len(group.members),
        balance=0.0,
    )


def _group_to_detail(group: Group, current_user_id) -> GroupDetailResponse:
    members = [
        GroupMemberResponse(
            id=str(m.id),
            user=UserResponse(
                id=str(m.user.id),
                email=m.user.email,
                display_name=m.user.display_name,
                phone_number=m.user.phone_number,
                avatar_url=m.user.avatar_url,
            ),
            joined_at=m.joined_at.isoformat(),
        )
        for m in group.members
    ]
    return GroupDetailResponse(
        id=str(group.id),
        name=group.name,
        description=group.description,
        avatar_url=group.avatar_url,
        created_by=str(group.created_by),
        member_count=len(members),
        balance=0.0,
        members=members,
    )


@router.get("/", response_model=list[GroupResponse])
def list_groups(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    return [_group_to_response(m.group, current_user.id) for m in memberships]


@router.post("/", response_model=GroupDetailResponse, status_code=201)
def create_group(body: CreateGroupRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = Group(name=body.name, description=body.description, created_by=current_user.id)
    db.add(group)
    db.flush()

    member = GroupMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    db.refresh(group)
    return _group_to_detail(group, current_user.id)


@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Group not found")
    return _group_to_detail(membership.group, current_user.id)


@router.post("/{group_id}/members", response_model=GroupDetailResponse, status_code=201)
def add_member(
    group_id: str,
    body: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Group not found")

    target = db.query(User).filter(User.email == body.email).first()
    if not target:
        raise HTTPException(status_code=404, detail="No user found with that email")

    already = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == target.id,
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="User is already in this group")

    new_member = GroupMember(group_id=group_id, user_id=target.id)
    db.add(new_member)
    db.commit()
    db.refresh(membership.group)
    return _group_to_detail(membership.group, current_user.id)


@router.delete("/{group_id}/members/{user_id}", status_code=204)
def remove_member(
    group_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Can remove yourself or others (equal power — no admin)
    requesting_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not requesting_membership:
        raise HTTPException(status_code=404, detail="Group not found")

    target_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
    ).first()
    if not target_membership:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(target_membership)
    db.commit()
