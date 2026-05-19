import secrets
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session

from database import get_db
from models import User, PasswordResetToken, EmailVerificationToken
from schemas import UserCreate, UserLogin, Token, UserOut, ForgotPasswordRequest, ResetPasswordRequest
from auth import hash_password, verify_password, create_access_token, require_auth
from email_utils import send_password_reset, send_email_verification
from rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("stockview.auth")

RESET_TOKEN_HOURS   = 1
VERIFY_TOKEN_HOURS  = 48
MAX_LOGIN_ATTEMPTS  = 5
LOCKOUT_MINUTES     = 15


def _check_lockout(user: User):
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = int((user.locked_until - datetime.utcnow()).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account locked due to too many failed attempts. Try again in {remaining} minute(s).",
        )


def _record_failed_login(user: User, db: Session):
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    logger.warning("Failed login attempt for user_id=%s (attempt %s)", user.id, user.failed_login_attempts)
    if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
        user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
        logger.warning("Account locked for user_id=%s until %s", user.id, user.locked_until)
    db.commit()


def _clear_failed_logins(user: User, db: Session):
    if user.failed_login_attempts or user.locked_until:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(request: Request, body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
        token_version=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token_str = secrets.token_urlsafe(32)
    vtoken = EmailVerificationToken(
        user_id=user.id,
        token=token_str,
        expires_at=datetime.utcnow() + timedelta(hours=VERIFY_TOKEN_HOURS),
    )
    db.add(vtoken)
    db.commit()
    send_email_verification(user.email, user.username, token_str)

    token = create_access_token({"sub": str(user.id), "tv": user.token_version or 0})
    logger.info("New user registered: user_id=%s", user.id)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    # Look up by email — constant-time safe: always hash-check even on miss
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user:
        # Constant-time dummy check to prevent timing-based user enumeration
        hash_password("dummy-timing-resistance")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    _check_lockout(user)

    if not verify_password(credentials.password, user.hashed_password):
        _record_failed_login(user, db)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    _clear_failed_logins(user, db)
    token = create_access_token({"sub": str(user.id), "tv": user.token_version or 0})
    logger.info("Successful login: user_id=%s", user.id)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(require_auth)):
    return current_user


@router.post("/forgot-password", status_code=200)
@limiter.limit("3/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    # Always return 200 — never reveal whether an email exists
    if not user:
        return {"message": "If that email is registered, you'll receive a reset link shortly."}

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,
    ).update({"used": True})

    token_str = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token_str,
        expires_at=datetime.utcnow() + timedelta(hours=RESET_TOKEN_HOURS),
    )
    db.add(reset_token)
    db.commit()

    send_password_reset(user.email, token_str)
    logger.info("Password reset requested for user_id=%s", user.id)
    return {"message": "If that email is registered, you'll receive a reset link shortly."}


@router.post("/reset-password", status_code=200)
@limiter.limit("5/minute")
def reset_password(request: Request, body: ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == body.token,
        PasswordResetToken.used == False,
    ).first()

    if not record or record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset link.")

    user.hashed_password = hash_password(body.new_password)
    user.token_version = (user.token_version or 0) + 1  # invalidate all existing sessions
    user.failed_login_attempts = 0
    user.locked_until = None
    record.used = True
    db.commit()
    logger.info("Password reset completed for user_id=%s", user.id)
    return {"message": "Password updated successfully."}


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token,
        EmailVerificationToken.used == False,
    ).first()

    if not record or record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification link.")

    user.email_verified = True
    record.used = True
    db.commit()
    return {"message": "Email verified successfully."}


@router.post("/resend-verification", status_code=200)
@limiter.limit("3/minute")
def resend_verification(request: Request, current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    if current_user.email_verified:
        return {"message": "Email is already verified."}

    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == current_user.id,
        EmailVerificationToken.used == False,
    ).update({"used": True})

    token_str = secrets.token_urlsafe(32)
    vtoken = EmailVerificationToken(
        user_id=current_user.id,
        token=token_str,
        expires_at=datetime.utcnow() + timedelta(hours=VERIFY_TOKEN_HOURS),
    )
    db.add(vtoken)
    db.commit()
    send_email_verification(current_user.email, current_user.username, token_str)
    return {"message": "Verification email sent."}
