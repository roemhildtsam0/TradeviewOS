from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import yfinance as yf

from database import get_db, SessionLocal
from models import User, PriceAlert
from schemas import PriceAlertCreate, PriceAlertOut
from auth import require_auth
from email_utils import send_price_alert

router = APIRouter(prefix="/alerts", tags=["alerts"])

MAX_ALERTS_PER_USER = 20


@router.get("")
def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    alerts = db.query(PriceAlert).filter(
        PriceAlert.user_id == current_user.id
    ).order_by(PriceAlert.created_at.desc()).all()
    return alerts


@router.post("", status_code=201)
def create_alert(
    body: PriceAlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    count = db.query(PriceAlert).filter(
        PriceAlert.user_id == current_user.id,
        PriceAlert.triggered == False,
    ).count()
    if count >= MAX_ALERTS_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {MAX_ALERTS_PER_USER} active alerts allowed.",
        )

    alert = PriceAlert(
        user_id=current_user.id,
        ticker=body.ticker,
        target_price=body.target_price,
        condition=body.condition,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=204)
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    alert = db.query(PriceAlert).filter(PriceAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your alert")
    db.delete(alert)
    db.commit()


def check_and_fire_alerts() -> None:
    """Background job: check untriggered alerts and send emails when hit."""
    db: Session = SessionLocal()
    try:
        pending = db.query(PriceAlert).filter(PriceAlert.triggered == False).all()
        if not pending:
            return

        # Group by ticker to minimise yfinance calls
        by_ticker: dict[str, list[PriceAlert]] = {}
        for a in pending:
            by_ticker.setdefault(a.ticker, []).append(a)

        for ticker, alerts in by_ticker.items():
            try:
                fi = yf.Ticker(ticker).fast_info
                price = float(getattr(fi, "last_price", 0) or 0)
                if price == 0:
                    continue
            except Exception:
                continue

            for alert in alerts:
                hit = (
                    (alert.condition == "above" and price >= alert.target_price) or
                    (alert.condition == "below" and price <= alert.target_price)
                )
                if hit:
                    alert.triggered = True
                    alert.triggered_at = datetime.utcnow()
                    user = db.query(User).filter(User.id == alert.user_id).first()
                    if user:
                        send_price_alert(user.email, ticker, alert.condition, alert.target_price, price)

        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
