import os
import logging
import stripe
from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

logger = logging.getLogger("stockview.subscription")

from database import get_db
from models import User
from auth import require_auth

router = APIRouter(prefix="/subscription", tags=["subscription"])

PLANS = {
    "beginner":     {"name": "Beginner",     "amount": 1000},
    "intermediate": {"name": "Intermediate", "amount": 2000},
    "commercial":   {"name": "Commercial",   "amount": 3000},
}

_price_ids: dict[str, str] = {}


def _stripe_enabled() -> bool:
    return bool(os.getenv("STRIPE_SECRET_KEY"))


def _init_price_ids():
    if not _stripe_enabled():
        return
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    for plan_key, plan in PLANS.items():
        env_val = os.getenv(f"STRIPE_PRICE_{plan_key.upper()}")
        if env_val:
            _price_ids[plan_key] = env_val
            continue
        # Find or create a Stripe product+price for this plan
        try:
            products = stripe.Product.list(limit=100)
            product_list = products.data if hasattr(products, "data") else list(products)
            for product in product_list:
                meta = product.metadata if hasattr(product, "metadata") else {}
                if meta.get("sv_plan") == plan_key and product.active:
                    prices = stripe.Price.list(product=product.id, active=True, limit=1)
                    price_list = prices.data if hasattr(prices, "data") else list(prices)
                    if price_list:
                        _price_ids[plan_key] = price_list[0].id
                        break
            if plan_key not in _price_ids:
                product = stripe.Product.create(
                    name=f"TradeviewAI {plan['name']}",
                    metadata={"sv_plan": plan_key},
                )
                price = stripe.Price.create(
                    product=product.id,
                    unit_amount=plan["amount"],
                    currency="usd",
                    recurring={"interval": "month"},
                )
                _price_ids[plan_key] = price.id
                logger.info("Created Stripe price for %s: %s", plan_key, price.id)
        except Exception as e:
            logger.warning("Could not initialize Stripe price for %s: %s", plan_key, e)


class CheckoutRequest(BaseModel):
    plan: str


def _get_or_create_customer(user: User, db: Session) -> str:
    if user.stripe_customer_id:
        return user.stripe_customer_id
    customer = stripe.Customer.create(
        email=user.email,
        metadata={"user_id": str(user.id)},
    )
    user.stripe_customer_id = customer.id
    db.commit()
    return customer.id


@router.get("/status")
def get_status(current_user: User = Depends(require_auth)):
    return {"tier": current_user.subscription_tier}


@router.post("/create-checkout")
def create_checkout(
    body: CheckoutRequest,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    if not _stripe_enabled():
        raise HTTPException(status_code=503, detail="Payments not configured")
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if body.plan not in _price_ids:
        raise HTTPException(status_code=503, detail="Stripe price not configured")

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    customer_id = _get_or_create_customer(current_user, db)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": _price_ids[body.plan], "quantity": 1}],
        success_url=f"{base_url}/account?success=true",
        cancel_url=f"{base_url}/pricing",
        metadata={"user_id": str(current_user.id), "plan": body.plan},
    )
    return {"url": session.url}


@router.post("/portal")
def create_portal(
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    if not _stripe_enabled():
        raise HTTPException(status_code=503, detail="Payments not configured")
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No active subscription")

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=f"{base_url}/account",
    )
    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook not configured")

    try:
        event = stripe.Webhook.construct_event(payload, sig, webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception:
        raise HTTPException(status_code=400, detail="Webhook error")

    if event.type == "checkout.session.completed":
        session = event.data.object
        user_id = session.metadata.get("user_id")
        plan = session.metadata.get("plan")
        if user_id and plan:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                user.subscription_tier = plan
                user.stripe_subscription_id = session.subscription
                db.commit()

    elif event.type in ("customer.subscription.updated", "customer.subscription.deleted"):
        sub = event.data.object
        user = db.query(User).filter(User.stripe_subscription_id == sub.id).first()
        if user:
            if event.type == "customer.subscription.deleted" or sub.status in ("canceled", "unpaid", "incomplete_expired"):
                user.subscription_tier = None
                user.stripe_subscription_id = None
            else:
                # Reflect plan changes made via the portal
                price_id = sub["items"]["data"][0]["price"]["id"]
                for plan_key, pid in _price_ids.items():
                    if pid == price_id:
                        user.subscription_tier = plan_key
                        break
            db.commit()

    return {"received": True}
