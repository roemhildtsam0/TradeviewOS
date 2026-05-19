from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import yfinance as yf

from database import get_db
from models import User, PortfolioPosition
from schemas import PortfolioPositionCreate, PortfolioPositionOut
from auth import require_auth

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def _live_price(ticker: str) -> float:
    try:
        fi = yf.Ticker(ticker).fast_info
        return float(getattr(fi, "last_price", 0) or 0)
    except Exception:
        return 0.0


@router.get("")
def get_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    positions = db.query(PortfolioPosition).filter(
        PortfolioPosition.user_id == current_user.id
    ).all()

    result = []
    total_value = 0.0
    total_cost = 0.0

    for pos in positions:
        price = _live_price(pos.ticker)
        market_value = price * pos.shares
        cost_basis = pos.avg_cost * pos.shares
        gain = market_value - cost_basis
        gain_pct = (gain / cost_basis * 100) if cost_basis else 0.0

        total_value += market_value
        total_cost += cost_basis

        result.append({
            "id": pos.id,
            "ticker": pos.ticker,
            "shares": pos.shares,
            "avg_cost": pos.avg_cost,
            "current_price": price,
            "market_value": round(market_value, 2),
            "cost_basis": round(cost_basis, 2),
            "gain": round(gain, 2),
            "gain_pct": round(gain_pct, 2),
            "added_at": pos.added_at,
        })

    total_gain = total_value - total_cost
    total_gain_pct = (total_gain / total_cost * 100) if total_cost else 0.0

    return {
        "positions": result,
        "summary": {
            "total_value": round(total_value, 2),
            "total_cost": round(total_cost, 2),
            "total_gain": round(total_gain, 2),
            "total_gain_pct": round(total_gain_pct, 2),
        },
    }


@router.post("", status_code=201)
def upsert_position(
    body: PortfolioPositionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    existing = db.query(PortfolioPosition).filter(
        PortfolioPosition.user_id == current_user.id,
        PortfolioPosition.ticker == body.ticker,
    ).first()

    if existing:
        # Weighted average cost
        total_shares = existing.shares + body.shares
        existing.avg_cost = (existing.avg_cost * existing.shares + body.avg_cost * body.shares) / total_shares
        existing.shares = total_shares
        db.commit()
        db.refresh(existing)
        pos = existing
    else:
        pos = PortfolioPosition(
            user_id=current_user.id,
            ticker=body.ticker,
            shares=body.shares,
            avg_cost=body.avg_cost,
        )
        db.add(pos)
        db.commit()
        db.refresh(pos)

    price = _live_price(pos.ticker)
    market_value = price * pos.shares
    cost_basis = pos.avg_cost * pos.shares
    gain = market_value - cost_basis
    gain_pct = (gain / cost_basis * 100) if cost_basis else 0.0

    return {
        "id": pos.id,
        "ticker": pos.ticker,
        "shares": pos.shares,
        "avg_cost": pos.avg_cost,
        "current_price": price,
        "market_value": round(market_value, 2),
        "cost_basis": round(cost_basis, 2),
        "gain": round(gain, 2),
        "gain_pct": round(gain_pct, 2),
        "added_at": pos.added_at,
    }


@router.put("/{ticker}")
def update_position(
    ticker: str,
    body: PortfolioPositionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    pos = db.query(PortfolioPosition).filter(
        PortfolioPosition.user_id == current_user.id,
        PortfolioPosition.ticker == ticker.upper(),
    ).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")

    pos.shares = body.shares
    pos.avg_cost = body.avg_cost
    db.commit()
    db.refresh(pos)

    price = _live_price(pos.ticker)
    market_value = price * pos.shares
    cost_basis = pos.avg_cost * pos.shares
    gain = market_value - cost_basis
    gain_pct = (gain / cost_basis * 100) if cost_basis else 0.0

    return {
        "id": pos.id,
        "ticker": pos.ticker,
        "shares": pos.shares,
        "avg_cost": pos.avg_cost,
        "current_price": price,
        "market_value": round(market_value, 2),
        "cost_basis": round(cost_basis, 2),
        "gain": round(gain, 2),
        "gain_pct": round(gain_pct, 2),
        "added_at": pos.added_at,
    }


@router.delete("/{ticker}", status_code=204)
def delete_position(
    ticker: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    pos = db.query(PortfolioPosition).filter(
        PortfolioPosition.user_id == current_user.id,
        PortfolioPosition.ticker == ticker.upper(),
    ).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    db.delete(pos)
    db.commit()
