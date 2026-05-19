import re
import logging
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from zoneinfo import ZoneInfo
from datetime import datetime, timedelta, timezone
import yfinance as yf
import pandas as pd
import numpy as np

from cache import cache
import price_store

logger = logging.getLogger("stockview.stocks")

_TICKER_RE = re.compile(r"^[A-Z0-9\-\^\.]{1,12}$")


def _validate_ticker(ticker: str) -> str:
    t = ticker.upper().strip()
    if not _TICKER_RE.match(t):
        raise HTTPException(status_code=400, detail="Invalid ticker symbol")
    return t

router = APIRouter(prefix="/stocks", tags=["stocks"])

POPULAR_STOCKS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
    "AMD", "NFLX", "JPM", "BAC", "XOM", "WMT", "DIS", "PYPL",
    "INTC", "CRM", "ADBE", "ORCL", "UBER", "PLTR", "COIN",
    "SHOP", "SNOW", "CRWD",
]

INDICES = [
    {"ticker": "^GSPC", "name": "S&P 500", "short": "SPX"},
    {"ticker": "^IXIC", "name": "NASDAQ", "short": "COMP"},
    {"ticker": "^DJI",  "name": "Dow Jones", "short": "DJIA"},
]

STOCK_DATABASE = [
    {"ticker": "AAPL",  "name": "Apple Inc."},
    {"ticker": "MSFT",  "name": "Microsoft Corporation"},
    {"ticker": "GOOGL", "name": "Alphabet Inc. (Class A)"},
    {"ticker": "GOOG",  "name": "Alphabet Inc. (Class C)"},
    {"ticker": "AMZN",  "name": "Amazon.com Inc."},
    {"ticker": "META",  "name": "Meta Platforms Inc."},
    {"ticker": "NVDA",  "name": "NVIDIA Corporation"},
    {"ticker": "TSLA",  "name": "Tesla Inc."},
    {"ticker": "BRK-B", "name": "Berkshire Hathaway Inc."},
    {"ticker": "LLY",   "name": "Eli Lilly and Company"},
    {"ticker": "JPM",   "name": "JPMorgan Chase & Co."},
    {"ticker": "V",     "name": "Visa Inc."},
    {"ticker": "UNH",   "name": "UnitedHealth Group Inc."},
    {"ticker": "AVGO",  "name": "Broadcom Inc."},
    {"ticker": "XOM",   "name": "Exxon Mobil Corporation"},
    {"ticker": "MA",    "name": "Mastercard Incorporated"},
    {"ticker": "PG",    "name": "Procter & Gamble Co."},
    {"ticker": "JNJ",   "name": "Johnson & Johnson"},
    {"ticker": "COST",  "name": "Costco Wholesale Corporation"},
    {"ticker": "HD",    "name": "The Home Depot Inc."},
    {"ticker": "MRK",   "name": "Merck & Co. Inc."},
    {"ticker": "ABBV",  "name": "AbbVie Inc."},
    {"ticker": "CRM",   "name": "Salesforce Inc."},
    {"ticker": "AMD",   "name": "Advanced Micro Devices Inc."},
    {"ticker": "NFLX",  "name": "Netflix Inc."},
    {"ticker": "INTC",  "name": "Intel Corporation"},
    {"ticker": "DIS",   "name": "The Walt Disney Company"},
    {"ticker": "ORCL",  "name": "Oracle Corporation"},
    {"ticker": "ADBE",  "name": "Adobe Inc."},
    {"ticker": "PYPL",  "name": "PayPal Holdings Inc."},
    {"ticker": "BAC",   "name": "Bank of America Corporation"},
    {"ticker": "WMT",   "name": "Walmart Inc."},
    {"ticker": "KO",    "name": "The Coca-Cola Company"},
    {"ticker": "PFE",   "name": "Pfizer Inc."},
    {"ticker": "UBER",  "name": "Uber Technologies Inc."},
    {"ticker": "PLTR",  "name": "Palantir Technologies Inc."},
    {"ticker": "COIN",  "name": "Coinbase Global Inc."},
    {"ticker": "SNAP",  "name": "Snap Inc."},
    {"ticker": "SPOT",  "name": "Spotify Technology S.A."},
    {"ticker": "LYFT",  "name": "Lyft Inc."},
    {"ticker": "DOCU",  "name": "DocuSign Inc."},
    {"ticker": "ZM",    "name": "Zoom Video Communications Inc."},
    {"ticker": "CRWD",  "name": "CrowdStrike Holdings Inc."},
    {"ticker": "SNOW",  "name": "Snowflake Inc."},
    {"ticker": "SOFI",  "name": "SoFi Technologies Inc."},
    {"ticker": "GS",    "name": "Goldman Sachs Group Inc."},
    {"ticker": "MS",    "name": "Morgan Stanley"},
    {"ticker": "WFC",   "name": "Wells Fargo & Company"},
    {"ticker": "C",     "name": "Citigroup Inc."},
    {"ticker": "SPY",   "name": "SPDR S&P 500 ETF Trust"},
    {"ticker": "QQQ",   "name": "Invesco QQQ Trust"},
    {"ticker": "SHOP",  "name": "Shopify Inc."},
    {"ticker": "SQ",    "name": "Block Inc."},
    {"ticker": "RBLX",  "name": "Roblox Corporation"},
    {"ticker": "HOOD",  "name": "Robinhood Markets Inc."},
    {"ticker": "ARM",   "name": "Arm Holdings plc"},
    {"ticker": "SMCI",  "name": "Super Micro Computer Inc."},
    {"ticker": "MU",    "name": "Micron Technology Inc."},
    {"ticker": "QCOM",  "name": "Qualcomm Incorporated"},
    {"ticker": "TXN",   "name": "Texas Instruments Incorporated"},
    {"ticker": "AMAT",  "name": "Applied Materials Inc."},
    {"ticker": "LRCX",  "name": "Lam Research Corporation"},
    {"ticker": "NOW",   "name": "ServiceNow Inc."},
    {"ticker": "PANW",  "name": "Palo Alto Networks Inc."},
    {"ticker": "ZS",    "name": "Zscaler Inc."},
    {"ticker": "NET",   "name": "Cloudflare Inc."},
    {"ticker": "DDOG",  "name": "Datadog Inc."},
    {"ticker": "MDB",   "name": "MongoDB Inc."},
    {"ticker": "ESTC",  "name": "Elastic N.V."},
]


def is_market_open() -> bool:
    now = datetime.now(ZoneInfo("America/New_York"))
    if now.weekday() >= 5:
        return False
    open_t = now.replace(hour=9, minute=30, second=0, microsecond=0)
    close_t = now.replace(hour=16, minute=0, second=0, microsecond=0)
    return open_t <= now <= close_t


def _safe_float(val, default=0.0) -> float:
    try:
        if val is None:
            return default
        f = float(val)
        return default if (f != f) else f  # NaN check
    except (TypeError, ValueError):
        return default


def _safe_int(val, default=0) -> int:
    try:
        if val is None:
            return default
        return int(float(val))
    except (TypeError, ValueError):
        return default


def _fetch_last_close(symbol: str) -> tuple[float, float]:
    """Return (last_close, prev_close) from recent daily history. Used as fallback."""
    hist = yf.download(symbol, period="5d", interval="1d", progress=False, auto_adjust=True)
    if isinstance(hist.columns, pd.MultiIndex):
        hist.columns = hist.columns.get_level_values(0)
    hist = hist.dropna(subset=["Close"])
    if hist.empty:
        return 0.0, 0.0
    closes = hist["Close"].tolist()
    last = float(closes[-1])
    prev = float(closes[-2]) if len(closes) >= 2 else last
    return last, prev


def fetch_quote(symbol: str) -> dict:
    key = f"quote:{symbol}"
    hit = cache.get(key)
    if hit:
        return hit

    market_open = is_market_open()
    ttl = 30 if market_open else 300

    try:
        t = yf.Ticker(symbol)
        fi = t.fast_info

        price = _safe_float(getattr(fi, "last_price", None))
        prev = _safe_float(getattr(fi, "previous_close", None))

        # fast_info can return 0 when market is closed — fall back to history
        if price == 0:
            price, hist_prev = _fetch_last_close(symbol)
            if prev == 0:
                prev = hist_prev

        if prev == 0:
            prev = price

        change = price - prev
        change_pct = (change / prev * 100) if prev else 0.0

        try:
            info = t.info or {}
        except Exception:
            info = {}

        result = {
            "ticker": symbol,
            "name": info.get("shortName") or info.get("longName") or symbol,
            "price": round(price, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "volume": _safe_int(getattr(fi, "three_month_average_volume", None)),
            "market_cap": _safe_int(getattr(fi, "market_cap", None)),
            "pe_ratio": _safe_float(info.get("trailingPE"), None),
            "high_52w": round(_safe_float(getattr(fi, "year_high", None)), 2),
            "low_52w": round(_safe_float(getattr(fi, "year_low", None)), 2),
            "day_high": round(_safe_float(getattr(fi, "day_high", None)), 2),
            "day_low": round(_safe_float(getattr(fi, "day_low", None)), 2),
            "market_open": market_open,
        }

        if price > 0:
            price_store.save(symbol, result)

        cache.set(key, result, ttl=ttl)
        return result
    except Exception:
        stored = price_store.get(symbol)
        if stored:
            cache.set(key, stored, ttl=ttl)
            return stored
        raise HTTPException(status_code=404, detail=f"Ticker not found: {symbol}")


def fetch_quote_safe(symbol: str) -> Optional[dict]:
    try:
        return fetch_quote(symbol)
    except Exception:
        return None


@router.get("/quote/{ticker}")
async def get_quote(ticker: str):
    return fetch_quote(_validate_ticker(ticker))


@router.get("/history/{ticker}")
async def get_history(ticker: str, period: str = "1mo"):
    ticker = _validate_ticker(ticker)
    period_map = {
        "1d":  ("1d",  "5m"),
        "1w":  ("5d",  "1h"),
        "1mo": ("1mo", "1d"),
        "1y":  ("1y",  "1wk"),
        "all": ("max", "1mo"),
    }
    if period not in period_map:
        raise HTTPException(status_code=400, detail="Invalid period")
    yf_period, interval = period_map[period]
    key = f"history:{ticker}:{period}"

    hit = cache.get(key)
    if hit:
        return hit

    try:
        data = yf.download(
            ticker,
            period=yf_period,
            interval=interval,
            progress=False,
            auto_adjust=True,
        )

        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)

        data = data.dropna(subset=["Close"])

        if data.empty:
            raise HTTPException(status_code=404, detail="No historical data found")

        records = []
        for idx, row in data.iterrows():
            try:
                records.append({
                    "time": idx.isoformat(),
                    "open":  round(_safe_float(row.get("Open")), 2),
                    "high":  round(_safe_float(row.get("High")), 2),
                    "low":   round(_safe_float(row.get("Low")), 2),
                    "close": round(_safe_float(row.get("Close")), 2),
                    "volume": _safe_int(row.get("Volume")),
                })
            except Exception:
                continue

        result = {"ticker": ticker, "period": period, "data": records}
        cache.set(key, result, ttl=60 if period == "1d" else 300)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("History fetch error for %s: %s", ticker, e)
        raise HTTPException(status_code=500, detail="Failed to fetch historical data")


@router.get("/indices")
async def get_indices():
    key = "indices"
    hit = cache.get(key)
    if hit:
        return hit

    results = []
    for idx in INDICES:
        try:
            q = fetch_quote(idx["ticker"])
            q["short"] = idx["short"]
            results.append(q)
        except Exception:
            pass

    market_open = is_market_open()
    data = {"indices": results, "market_open": market_open}
    cache.set(key, data, ttl=30 if market_open else 300)
    return data


@router.get("/movers")
async def get_movers():
    key = "movers"
    hit = cache.get(key)
    if hit:
        return hit

    market_open = is_market_open()

    with ThreadPoolExecutor(max_workers=10) as ex:
        futures = {ex.submit(fetch_quote_safe, t): t for t in POPULAR_STOCKS}
        quotes = [f.result() for f in as_completed(futures)]

    quotes = [q for q in quotes if q and q.get("price", 0) > 0]
    quotes.sort(key=lambda x: x.get("change_pct", 0), reverse=True)

    result = {
        "gainers": quotes[:6],
        "losers": list(reversed(quotes[-6:])),
    }
    cache.set(key, result, ttl=60 if market_open else 600)
    return result


@router.get("/trending")
async def get_trending():
    key = "trending"
    hit = cache.get(key)
    if hit:
        return hit

    market_open = is_market_open()

    with ThreadPoolExecutor(max_workers=10) as ex:
        futures = {ex.submit(fetch_quote_safe, t): t for t in POPULAR_STOCKS}
        quotes = [f.result() for f in as_completed(futures)]

    quotes = [q for q in quotes if q and q.get("price", 0) > 0]
    quotes.sort(key=lambda x: x.get("volume", 0), reverse=True)

    result = {"trending": quotes[:12]}
    cache.set(key, result, ttl=60 if market_open else 600)
    return result


@router.get("/search")
async def search_stocks(q: str = Query(..., min_length=1, max_length=50)):
    q_up = q.upper().strip()
    q_lo = q.lower().strip()

    results = []
    for stock in STOCK_DATABASE:
        if stock["ticker"].startswith(q_up) or q_lo in stock["name"].lower():
            results.append(stock)
        if len(results) >= 8:
            break

    return {"results": results}


_PROJ_CONFIG = {
    "1d":  ("1d",  "5m",  24, 5 * 60),
    "1w":  ("5d",  "1h",  24, 3600),
    "1mo": ("1mo", "1d",  10, 86400),
    "1y":  ("1y",  "1wk",  8, 7 * 86400),
}


@router.get("/projection/{ticker}")
async def get_projection(ticker: str, period: str = "1mo"):
    ticker = _validate_ticker(ticker)
    if period not in _PROJ_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid period")

    key = f"projection:{ticker}:{period}"
    hit = cache.get(key)
    if hit:
        return hit

    yf_period, interval, n_forward, interval_secs = _PROJ_CONFIG[period]

    try:
        data = yf.download(
            ticker.upper(), period=yf_period, interval=interval,
            progress=False, auto_adjust=True,
        )
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        data = data.dropna(subset=["Close"])

        if len(data) < 5:
            raise HTTPException(status_code=404, detail="Not enough data for projection")

        closes = np.array([float(v) for v in data["Close"].tolist()])
        n = len(closes)
        x = np.arange(n, dtype=float)

        x_mean, y_mean = x.mean(), closes.mean()
        denom = float(((x - x_mean) ** 2).sum())
        slope = float(((x - x_mean) * (closes - y_mean)).sum() / denom) if denom else 0.0
        intercept = float(y_mean - slope * x_mean)

        y_fit = slope * x + intercept
        std = float(np.std(closes - y_fit))

        last_dt = data.index[-1].to_pydatetime()
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)

        proj_data = []
        for i in range(1, n_forward + 1):
            y_proj = slope * (n + i - 1) + intercept
            proj_data.append({
                "time": (last_dt + timedelta(seconds=interval_secs * i)).isoformat(),
                "proj":       round(float(y_proj), 2),
                "proj_upper": round(float(y_proj + 1.5 * std), 2),
                "proj_lower": round(float(y_proj - 1.5 * std), 2),
            })

        current = float(closes[-1])
        target  = proj_data[-1]["proj"] if proj_data else current
        cv = std / float(y_mean) if y_mean else 0

        result = {
            "ticker":        ticker.upper(),
            "period":        period,
            "trend":         "bullish" if slope > 0 else "bearish",
            "confidence":    "high" if cv < 0.01 else "medium" if cv < 0.03 else "low",
            "current_price": round(current, 2),
            "target_price":  round(target, 2),
            "target_pct":    round((target / current - 1) * 100, 2) if current else 0,
            "data":          proj_data,
        }

        cache.set(key, result, ttl=300)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Projection error for %s: %s", ticker, e)
        raise HTTPException(status_code=500, detail="Failed to compute projection")
