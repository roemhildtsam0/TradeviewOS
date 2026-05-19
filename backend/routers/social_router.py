import re
import logging
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from typing import Optional
from pathlib import Path
import secrets, base64, os
from better_profanity import profanity
import anthropic
import yfinance as yf

logger = logging.getLogger("stockview.social")

# Magic-byte signatures for allowed image types
_MAGIC: dict[bytes, str] = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"RIFF": "image/webp",   # checked further below
}

from database import get_db
from models import User, Post, PostLike, Prediction
from schemas import PostCreate, PostOut, PredictionCreate, PredictionOut, LeaderboardEntry, AuthorOut
from auth import require_auth, get_current_user

router = APIRouter(prefix="/social", tags=["social"])

profanity.load_censor_words()

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

# GIF isn't supported by the Anthropic vision API — treat as unverifiable
_VISION_TYPES = {"image/jpeg", "image/png", "image/webp"}

_SAFE_FILENAME_RE = re.compile(r"^[a-zA-Z0-9_-]+$")


def _detect_image_type(data: bytes) -> Optional[str]:
    """Return MIME type inferred from magic bytes, or None if unrecognised."""
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def _verify_chart_image(data: bytes, content_type: str) -> None:
    """Raise HTTPException if the image is not a financial/trading chart."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or content_type not in _VISION_TYPES:
        return  # skip validation when unconfigured or unsupported type

    try:
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": content_type,
                            "data": base64.standard_b64encode(data).decode(),
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "Does this image show a stock price chart, candlestick chart, "
                            "trading chart, or other financial/market chart? "
                            "Reply with only YES or NO."
                        ),
                    },
                ],
            }],
        )
        answer = msg.content[0].text.strip().upper()
        if not answer.startswith("YES"):
            raise HTTPException(
                status_code=400,
                detail="Please upload a chart screenshot. The image doesn't appear to show a stock or trading chart.",
            )
    except HTTPException:
        raise
    except Exception:
        pass  # fail open if the API call errors


def _check_content(text: str):
    if profanity.contains_profanity(text):
        raise HTTPException(
            status_code=400,
            detail="Your post contains language that isn't allowed. Please keep the community respectful.",
        )


def _author_out(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "subscription_tier": user.subscription_tier,
    }


def _resolve_pending(db: Session):
    """Lazily resolve predictions whose timeframe has expired."""
    now = datetime.utcnow()
    pending = (
        db.query(Prediction)
        .filter(Prediction.resolved == False, Prediction.resolves_at <= now)
        .all()
    )
    if not pending:
        return
    for pred in pending:
        try:
            fi = yf.Ticker(pred.ticker).fast_info
            price = float(getattr(fi, "last_price", 0) or 0)
            if price == 0:
                continue
            pred.resolved_price = price
            pred.correct = (price > pred.entry_price) if pred.direction == "up" else (price < pred.entry_price)
            pred.resolved = True
        except Exception:
            continue
    db.commit()


def _post_to_out(post: Post, liked_by_me: bool) -> dict:
    return {
        "id": post.id,
        "content": post.content,
        "ticker": post.ticker,
        "likes_count": post.likes_count,
        "liked_by_me": liked_by_me,
        "created_at": post.created_at,
        "author": _author_out(post.author),
    }


# ── Posts ─────────────────────────────────────────────────────────────────

@router.get("/posts")
def get_posts(
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    ticker: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    q = db.query(Post)
    if ticker:
        q = q.filter(Post.ticker == ticker.upper())
    total = q.count()
    posts = q.order_by(Post.created_at.desc()).offset(offset).limit(limit).all()

    liked_ids: set[int] = set()
    if current_user:
        liked_ids = {
            pl.post_id for pl in
            db.query(PostLike).filter(
                PostLike.user_id == current_user.id,
                PostLike.post_id.in_([p.id for p in posts]),
            ).all()
        }

    return {
        "posts": [_post_to_out(p, p.id in liked_ids) for p in posts],
        "total": total,
    }


@router.post("/posts", status_code=201)
def create_post(
    body: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    _check_content(body.content)
    post = Post(
        user_id=current_user.id,
        content=body.content,
        ticker=body.ticker,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _post_to_out(post, False)


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your post")
    db.delete(post)
    db.commit()


@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(PostLike).filter(
        PostLike.user_id == current_user.id,
        PostLike.post_id == post_id,
    ).first()

    if existing:
        db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        db.add(PostLike(user_id=current_user.id, post_id=post_id))
        post.likes_count += 1
        liked = True

    db.commit()
    return {"liked": liked, "likes_count": post.likes_count}


# ── Image upload ──────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_auth),
):
    # Read data first so we can inspect magic bytes
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # Validate via magic bytes — never trust the client-supplied Content-Type
    detected = _detect_image_type(data)
    if not detected:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, GIF, and WebP images are allowed")

    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp"}
    ext = ext_map[detected]

    # Verify it's actually a chart before saving
    _verify_chart_image(data, detected)

    # Generate a cryptographically random filename — never use user-supplied name
    filename = f"{secrets.token_hex(16)}.{ext}"
    (UPLOAD_DIR / filename).write_bytes(data)
    logger.info("Image uploaded by user_id=%s: %s", current_user.id, filename)
    return {"url": f"/uploads/{filename}"}


# ── Predictions ───────────────────────────────────────────────────────────

@router.get("/predictions")
def get_predictions(
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    ticker: Optional[str] = None,
    db: Session = Depends(get_db),
):
    _resolve_pending(db)

    q = db.query(Prediction)
    if ticker:
        q = q.filter(Prediction.ticker == ticker.upper())
    total = q.count()
    preds = q.order_by(Prediction.created_at.desc()).offset(offset).limit(limit).all()
    return {"predictions": preds, "total": total}


@router.post("/predictions", status_code=201)
def create_prediction(
    body: PredictionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    # Validate note for profanity
    if body.note:
        _check_content(body.note)

    # Fetch live entry price
    try:
        fi = yf.Ticker(body.ticker).fast_info
        entry_price = float(getattr(fi, "last_price", 0) or 0)
        if entry_price == 0:
            raise ValueError
    except Exception:
        raise HTTPException(status_code=400, detail=f"Could not fetch price for {body.ticker}")

    now = datetime.utcnow()
    pred = Prediction(
        user_id=current_user.id,
        ticker=body.ticker,
        direction=body.direction,
        timeframe_days=body.timeframe_days,
        entry_price=entry_price,
        note=body.note,
        image_url=body.image_url,
        resolves_at=now + timedelta(days=body.timeframe_days),
    )
    db.add(pred)
    db.commit()
    db.refresh(pred)
    return pred


@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    _resolve_pending(db)

    rows = (
        db.query(
            User.id,
            User.username,
            User.subscription_tier,
            func.count(Prediction.id).label("total"),
            func.sum(case((Prediction.correct == True, 1), else_=0)).label("correct"),
        )
        .join(Prediction, User.id == Prediction.user_id)
        .filter(Prediction.resolved == True)
        .group_by(User.id)
        .having(func.count(Prediction.id) >= 3)
        .order_by(
            (func.sum(case((Prediction.correct == True, 1), else_=0)) * 1.0 /
             func.count(Prediction.id)).desc()
        )
        .limit(10)
        .all()
    )

    return [
        {
            "username": r.username,
            "subscription_tier": r.subscription_tier,
            "total": r.total,
            "correct": r.correct or 0,
            "accuracy": round((r.correct or 0) / r.total * 100, 1),
        }
        for r in rows
    ]


@router.get("/users/{username}/stats")
def get_user_stats(username: str, db: Session = Depends(get_db)):
    _resolve_pending(db)

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    total   = db.query(Prediction).filter(Prediction.user_id == user.id, Prediction.resolved == True).count()
    correct = db.query(Prediction).filter(Prediction.user_id == user.id, Prediction.resolved == True, Prediction.correct == True).count()
    pending = db.query(Prediction).filter(Prediction.user_id == user.id, Prediction.resolved == False).count()

    return {
        "username": user.username,
        "subscription_tier": user.subscription_tier,
        "total": total,
        "correct": correct,
        "pending": pending,
        "accuracy": round(correct / total * 100, 1) if total else None,
    }
