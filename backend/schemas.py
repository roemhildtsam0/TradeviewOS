from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if not all(c.isalnum() or c in "_-" for c in v):
            raise ValueError("Username may only contain letters, numbers, - and _")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime
    subscription_tier: Optional[str] = None
    email_verified: bool = False

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class WatchlistItemOut(BaseModel):
    id: int
    ticker: str
    added_at: datetime

    model_config = {"from_attributes": True}


# ── Password reset ────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ── Social ────────────────────────────────────────────────────────────────

class AuthorOut(BaseModel):
    id: int
    username: str
    subscription_tier: Optional[str] = None

    model_config = {"from_attributes": True}


class PostCreate(BaseModel):
    content: str
    ticker: Optional[str] = None

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1:
            raise ValueError("Post cannot be empty")
        if len(v) > 500:
            raise ValueError("Post cannot exceed 500 characters")
        return v

    @field_validator("ticker")
    @classmethod
    def ticker_upper(cls, v: Optional[str]) -> Optional[str]:
        return v.upper().strip() if v else None


class PostOut(BaseModel):
    id: int
    content: str
    ticker: Optional[str]
    likes_count: int
    liked_by_me: bool = False
    created_at: datetime
    author: AuthorOut

    model_config = {"from_attributes": True}


class PredictionCreate(BaseModel):
    ticker: str
    direction: str        # "up" | "down"
    timeframe_days: int   # 1 | 7 | 30
    note: Optional[str] = None
    image_url: Optional[str] = None

    @field_validator("ticker")
    @classmethod
    def ticker_upper(cls, v: str) -> str:
        return v.upper().strip()

    @field_validator("direction")
    @classmethod
    def direction_valid(cls, v: str) -> str:
        if v not in ("up", "down"):
            raise ValueError("Direction must be 'up' or 'down'")
        return v

    @field_validator("timeframe_days")
    @classmethod
    def timeframe_valid(cls, v: int) -> int:
        if v not in (1, 7, 30):
            raise ValueError("Timeframe must be 1, 7, or 30 days")
        return v

    @field_validator("note")
    @classmethod
    def note_length(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = v.strip()
            if len(v) > 1000:
                raise ValueError("Note cannot exceed 1000 characters")
            return v or None
        return None


class PredictionOut(BaseModel):
    id: int
    ticker: str
    direction: str
    timeframe_days: int
    entry_price: float
    resolved_price: Optional[float]
    note: Optional[str] = None
    image_url: Optional[str] = None
    resolved: bool
    correct: Optional[bool]
    created_at: datetime
    resolves_at: datetime
    author: AuthorOut

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    username: str
    subscription_tier: Optional[str]
    total: int
    correct: int
    accuracy: float


# ── Portfolio ─────────────────────────────────────────────────────────────

class PortfolioPositionCreate(BaseModel):
    ticker: str
    shares: float
    avg_cost: float

    @field_validator("ticker")
    @classmethod
    def ticker_upper(cls, v: str) -> str:
        return v.upper().strip()

    @field_validator("shares")
    @classmethod
    def shares_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Shares must be greater than 0")
        return v

    @field_validator("avg_cost")
    @classmethod
    def cost_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Average cost must be greater than 0")
        return v


class PortfolioPositionOut(BaseModel):
    id: int
    ticker: str
    shares: float
    avg_cost: float
    added_at: datetime

    model_config = {"from_attributes": True}


# ── Price alerts ──────────────────────────────────────────────────────────

class PriceAlertCreate(BaseModel):
    ticker: str
    target_price: float
    condition: str  # "above" | "below"

    @field_validator("ticker")
    @classmethod
    def ticker_upper(cls, v: str) -> str:
        return v.upper().strip()

    @field_validator("condition")
    @classmethod
    def condition_valid(cls, v: str) -> str:
        if v not in ("above", "below"):
            raise ValueError("Condition must be 'above' or 'below'")
        return v

    @field_validator("target_price")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Target price must be greater than 0")
        return v


class PriceAlertOut(BaseModel):
    id: int
    ticker: str
    target_price: float
    condition: str
    triggered: bool
    triggered_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}
