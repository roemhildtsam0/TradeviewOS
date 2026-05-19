from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, WatchlistItem
from schemas import WatchlistItemOut
from auth import require_auth

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("", response_model=List[WatchlistItemOut])
def get_watchlist(
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    return current_user.watchlist


@router.post("/{ticker}", response_model=WatchlistItemOut, status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    ticker: str,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    ticker = ticker.upper()
    existing = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == current_user.id, WatchlistItem.ticker == ticker)
        .first()
    )
    if existing:
        return existing

    item = WatchlistItem(user_id=current_user.id, ticker=ticker)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{ticker}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_watchlist(
    ticker: str,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    ticker = ticker.upper()
    item = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == current_user.id, WatchlistItem.ticker == ticker)
        .first()
    )
    if item:
        db.delete(item)
        db.commit()
