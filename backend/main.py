import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import text, inspect as sa_inspect
from apscheduler.schedulers.background import BackgroundScheduler
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from rate_limit import limiter
import logging

from database import engine, Base
from routers.auth_router import router as auth_router
from routers.stocks_router import router as stocks_router
from routers.news_router import router as news_router
from routers.watchlist_router import router as watchlist_router
from routers.subscription_router import router as subscription_router, _init_price_ids
from routers.social_router import router as social_router
from routers.portfolio_router import router as portfolio_router
from routers.alerts_router import router as alerts_router, check_and_fire_alerts
import models
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stockview")

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

# ── DB setup ──────────────────────────────────────────────────────────────

Base.metadata.create_all(bind=engine)


def _migrate():
    # Only needed for existing SQLite databases — Postgres starts fresh via create_all
    if "postgresql" in str(engine.url):
        return
    insp = sa_inspect(engine)
    tables = insp.get_table_names()
    with engine.connect() as conn:
        if "users" in tables:
            cols = {c["name"] for c in insp.get_columns("users")}
            for col_name, col_type in [
                ("subscription_tier",       "VARCHAR"),
                ("stripe_customer_id",      "VARCHAR"),
                ("stripe_subscription_id",  "VARCHAR"),
                ("email_verified",          "BOOLEAN DEFAULT 0"),
                ("failed_login_attempts",   "INTEGER DEFAULT 0"),
                ("locked_until",            "DATETIME"),
                ("token_version",           "INTEGER DEFAULT 0"),
            ]:
                if col_name not in cols:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))

        if "predictions" in tables:
            cols = {c["name"] for c in insp.get_columns("predictions")}
            for col in ["note", "image_url"]:
                if col not in cols:
                    conn.execute(text(f"ALTER TABLE predictions ADD COLUMN {col} VARCHAR"))

        conn.commit()


_migrate()
_init_price_ids()

# ── CORS allowlist ────────────────────────────────────────────────────────

_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
ALLOWED_ORIGINS = [_frontend_url]
if not IS_PRODUCTION:
    ALLOWED_ORIGINS += ["http://localhost:5173", "http://127.0.0.1:5173"]

# ── App ───────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Stockview API",
    version="1.0.0",
    # Disable interactive docs in production
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ── Security headers middleware ───────────────────────────────────────────

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    # API-only CSP: only JSON responses, no HTML rendering
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    # Remove server fingerprinting
    response.headers.pop("server", None)
    return response


# ── Routers ───────────────────────────────────────────────────────────────

app.include_router(auth_router,         prefix="/api")
app.include_router(stocks_router,       prefix="/api")
app.include_router(news_router,         prefix="/api")
app.include_router(watchlist_router,    prefix="/api")
app.include_router(subscription_router, prefix="/api")
app.include_router(social_router,       prefix="/api")
app.include_router(portfolio_router,    prefix="/api")
app.include_router(alerts_router,       prefix="/api")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ── Background scheduler ──────────────────────────────────────────────────

scheduler = BackgroundScheduler()
scheduler.add_job(check_and_fire_alerts, "interval", minutes=5, id="price_alerts")
scheduler.start()


@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown(wait=False)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
