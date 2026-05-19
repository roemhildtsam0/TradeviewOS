from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    subscription_tier = Column(String, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    email_verified          = Column(Boolean,  default=False)
    failed_login_attempts   = Column(Integer,  default=0)
    locked_until            = Column(DateTime, nullable=True)
    token_version           = Column(Integer,  default=0)

    watchlist         = relationship("WatchlistItem",          back_populates="owner",  cascade="all, delete-orphan")
    posts             = relationship("Post",                   back_populates="author", cascade="all, delete-orphan")
    post_likes        = relationship("PostLike",               back_populates="user",   cascade="all, delete-orphan")
    predictions       = relationship("Prediction",             back_populates="author", cascade="all, delete-orphan")
    portfolio         = relationship("PortfolioPosition",      back_populates="owner",  cascade="all, delete-orphan")
    price_alerts      = relationship("PriceAlert",             back_populates="owner",  cascade="all, delete-orphan")
    reset_tokens      = relationship("PasswordResetToken",     back_populates="user",   cascade="all, delete-orphan")
    verify_tokens     = relationship("EmailVerificationToken", back_populates="user",   cascade="all, delete-orphan")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="watchlist")


class Post(Base):
    __tablename__ = "posts"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    content     = Column(String, nullable=False)
    ticker      = Column(String, nullable=True)
    likes_count = Column(Integer, default=0)
    created_at  = Column(DateTime, default=datetime.utcnow)

    author = relationship("User", back_populates="posts")
    likes  = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")


class PostLike(Base):
    __tablename__ = "post_likes"
    __table_args__ = (UniqueConstraint("user_id", "post_id"),)

    id      = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)

    user = relationship("User", back_populates="post_likes")
    post = relationship("Post", back_populates="likes")


class Prediction(Base):
    __tablename__ = "predictions"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker          = Column(String, nullable=False)
    direction       = Column(String, nullable=False)   # "up" | "down"
    timeframe_days  = Column(Integer, nullable=False)  # 1 | 7 | 30
    entry_price     = Column(Float, nullable=False)
    resolved_price  = Column(Float, nullable=True)
    note            = Column(String, nullable=True)
    image_url       = Column(String, nullable=True)
    resolved        = Column(Boolean, default=False)
    correct         = Column(Boolean, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    resolves_at     = Column(DateTime, nullable=False)

    author = relationship("User", back_populates="predictions")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    token      = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False)

    user = relationship("User", back_populates="reset_tokens")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    token      = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False)

    user = relationship("User", back_populates="verify_tokens")


class PortfolioPosition(Base):
    __tablename__ = "portfolio_positions"

    id       = Column(Integer, primary_key=True, index=True)
    user_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker   = Column(String, nullable=False)
    shares   = Column(Float, nullable=False)
    avg_cost = Column(Float, nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="portfolio")


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker       = Column(String, nullable=False)
    target_price = Column(Float, nullable=False)
    condition    = Column(String, nullable=False)  # "above" | "below"
    triggered    = Column(Boolean, default=False)
    triggered_at = Column(DateTime, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="price_alerts")
