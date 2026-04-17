from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.friendship import Friendship
from app.schemas.friends import FriendRequest, FriendUserResponse, FriendshipResponse
from app.services.balance import get_balances_for_user

router = APIRouter(prefix="/friends", tags=["friends"])


def _make_friend_response(friendship: Friendship, current_user_id) -> FriendshipResponse:
    friend = friendship.addressee if str(friendship.requester_id) == str(current_user_id) else friendship.requester
    balances = getattr(friendship, "_balance_map", {})
    balance = float(balances.get(str(friend.id), 0.0))
    return FriendshipResponse(
        id=str(friendship.id),
        status=friendship.status,
        friend=FriendUserResponse(
            id=str(friend.id),
            display_name=friend.display_name,
            email=friend.email,
            avatar_url=friend.avatar_url,
            balance=round(balance, 2),
        ),
    )


@router.get("/", response_model=list[FriendshipResponse])
def list_friends(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    balance_map = get_balances_for_user(str(current_user.id), db)
    friendships = db.query(Friendship).filter(
        or_(
            Friendship.requester_id == current_user.id,
            Friendship.addressee_id == current_user.id,
        ),
        Friendship.status == "accepted",
    ).all()
    for f in friendships:
        setattr(f, "_balance_map", balance_map)
    return [_make_friend_response(f, current_user.id) for f in friendships]


@router.get("/requests", response_model=list[FriendshipResponse])
def list_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    friendships = db.query(Friendship).filter(
        Friendship.addressee_id == current_user.id,
        Friendship.status == "pending",
    ).all()
    return [_make_friend_response(f, current_user.id) for f in friendships]


@router.post("/request", response_model=FriendshipResponse, status_code=201)
def send_request(body: FriendRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.email == body.email).first()
    if not target:
        raise HTTPException(status_code=404, detail="No user found with that email")
    if str(target.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="You cannot add yourself")

    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == target.id),
            and_(Friendship.requester_id == target.id, Friendship.addressee_id == current_user.id),
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Friend request already exists")

    friendship = Friendship(requester_id=current_user.id, addressee_id=target.id, status="pending")
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    return _make_friend_response(friendship, current_user.id)


@router.patch("/request/{friendship_id}", response_model=FriendshipResponse)
def respond_to_request(
    friendship_id: str,
    action: str,  # "accept" or "decline"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    friendship = db.query(Friendship).filter(
        Friendship.id == friendship_id,
        Friendship.addressee_id == current_user.id,
        Friendship.status == "pending",
    ).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")

    if action == "accept":
        friendship.status = "accepted"
        db.commit()
        db.refresh(friendship)
        return _make_friend_response(friendship, current_user.id)
    elif action == "decline":
        db.delete(friendship)
        db.commit()
        raise HTTPException(status_code=200, detail="Request declined")
    else:
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'decline'")


@router.delete("/{user_id}", status_code=204)
def remove_friend(user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    friendship = db.query(Friendship).filter(
        or_(
            and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == user_id),
            and_(Friendship.requester_id == user_id, Friendship.addressee_id == current_user.id),
        ),
        Friendship.status == "accepted",
    ).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend not found")
    db.delete(friendship)
    db.commit()
