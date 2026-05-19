from fastapi import APIRouter
from concurrent.futures import ThreadPoolExecutor, as_completed
import yfinance as yf

from cache import cache

router = APIRouter(prefix="/news", tags=["news"])

# ── Financial sentiment scorer ─────────────────────────────────────────────
_BULLISH_KW = {
    "beat": 3, "beats": 3, "surge": 3, "surges": 3, "soars": 3, "soar": 3,
    "jumps": 2, "jump": 2, "rallies": 2, "rally": 2, "rises": 2,
    "record": 2, "exceeds": 2, "exceed": 2, "raises guidance": 3,
    "upgrade": 2, "upgraded": 2, "outperform": 2, "outperforms": 2,
    "growth": 1, "profit": 1, "gains": 1, "strong": 1, "bullish": 3,
    "breakout": 2, "expansion": 1, "breakthrough": 2, "wins": 2,
    "approval": 2, "approved": 2, "deal": 1, "boost": 2, "boosted": 2,
    "recovery": 2, "higher": 1, "positive": 1, "increased": 1, "increase": 1,
    "blowout": 3, "upside": 2, "milestone": 1, "accelerates": 2,
}
_BEARISH_KW = {
    "miss": 3, "misses": 3, "missed": 3, "plunge": 3, "plunges": 3,
    "falls": 2, "fall": 2, "decline": 2, "declines": 2, "drops": 2, "drop": 2,
    "cut": 2, "cuts": 2, "warning": 2, "downgrade": 2, "downgraded": 2,
    "underperform": 2, "loss": 2, "weak": 2, "bearish": 3,
    "scrutiny": 2, "investigation": 2, "layoffs": 3, "lawsuit": 2,
    "fraud": 3, "tumbles": 3, "tumble": 2, "tanks": 2, "slump": 2,
    "disappoints": 2, "disappointing": 2, "crash": 2, "crashed": 3,
    "fine": 1, "penalty": 2, "ban": 2, "recall": 2, "concern": 1,
    "lower": 1, "negative": 1, "risk": 1, "below": 1, "shortfall": 2,
}


def _financial_sentiment(text: str) -> str:
    t = f" {text.lower()} "
    bull = sum(w for kw, w in _BULLISH_KW.items() if kw in t)
    bear = sum(w for kw, w in _BEARISH_KW.items() if kw in t)
    diff = bull - bear
    if diff >= 2:
        return "bullish"
    if diff <= -2:
        return "bearish"
    return "neutral"

MARKET_NEWS_TICKERS = ["SPY", "QQQ", "AAPL", "TSLA", "NVDA", "AMZN", "META", "MSFT"]

_TICKER_KEYWORDS: dict[str, str] = {
    "apple": "AAPL", "iphone": "AAPL", "ipad": "AAPL", " mac ": "AAPL", "macos": "AAPL",
    "microsoft": "MSFT", "azure": "MSFT", "windows": "MSFT",
    "google": "GOOGL", "alphabet": "GOOGL", "youtube": "GOOGL", "android": "GOOGL", "gemini": "GOOGL",
    "amazon": "AMZN", " aws ": "AMZN",
    "meta platform": "META", "facebook": "META", "instagram": "META", "whatsapp": "META",
    "nvidia": "NVDA",
    "tesla": "TSLA", "elon musk": "TSLA",
    "advanced micro": "AMD", " amd ": "AMD",
    "netflix": "NFLX",
    "jpmorgan": "JPM", "jp morgan": "JPM",
    "bank of america": "BAC",
    "exxon": "XOM",
    "walmart": "WMT",
    "disney": "DIS",
    "paypal": "PYPL",
    "intel": "INTC",
    "salesforce": "CRM",
    "adobe": "ADBE",
    "oracle": "ORCL",
    "uber": "UBER",
    "palantir": "PLTR",
    "coinbase": "COIN", "bitcoin": "COIN", "crypto": "COIN",
    "shopify": "SHOP",
    "snowflake": "SNOW",
    "crowdstrike": "CRWD",
    "s&p 500": "SPY", "s&p500": "SPY",
    "goldman sachs": "GS",
    "morgan stanley": "MS",
    "wells fargo": "WFC",
    "citigroup": "C", " citi ": "C",
    "qualcomm": "QCOM",
    "broadcom": "AVGO",
    "servicenow": "NOW",
    "palo alto": "PANW",
    "cloudflare": "NET",
    "datadog": "DDOG",
    "mongodb": "MDB",
    "block inc": "SQ", " square ": "SQ",
    "robinhood": "HOOD",
    "arm holdings": "ARM",
    "micron": "MU",
    "eli lilly": "LLY",
    "pfizer": "PFE",
    "merck": "MRK",
    "abbvie": "ABBV",
    "costco": "COST",
    "home depot": "HD",
    " visa ": "V",
    "mastercard": "MA",
    "lyft": "LYFT",
    "snapchat": "SNAP", " snap ": "SNAP",
    "spotify": "SPOT",
    " zoom ": "ZM",
    "docusign": "DOCU",
    "sofi": "SOFI",
    "roblox": "RBLX",
    "berkshire": "BRK-B",
    "unitedhealth": "UNH",
    "johnson & johnson": "JNJ",
    "coca-cola": "KO", "coca cola": "KO",
    "zscaler": "ZS",
    "lam research": "LRCX",
    "applied materials": "AMAT",
    "texas instruments": "TXN",
    "supermicro": "SMCI", "super micro": "SMCI",
    "openai": "MSFT",
    "tariff": "SPY", "fed rate": "SPY", "interest rate": "SPY", "inflation": "SPY",
    "semiconductor": "NVDA",
    "electric vehicle": "TSLA", " ev ": "TSLA",
    "streaming": "NFLX",
    "cloud": "MSFT",
    "ai chip": "NVDA", "artificial intelligence": "NVDA",
}


def _suggest_tickers(text: str) -> list[str]:
    text_lower = f" {text.lower()} "
    found: list[str] = []
    seen: set[str] = set()
    for keyword, ticker in _TICKER_KEYWORDS.items():
        if keyword in text_lower and ticker not in seen:
            found.append(ticker)
            seen.add(ticker)
    return found[:4]


def _parse_article(item: dict, fallback_ticker: str) -> dict | None:
    content = item.get("content", {})
    title = content.get("title", "").strip()
    if not title:
        return None

    summary = content.get("summary", "") or content.get("description", "")
    publisher = (content.get("provider") or {}).get("displayName", "")
    link = (
        (content.get("canonicalUrl") or {}).get("url", "")
        or (content.get("clickThroughUrl") or {}).get("url", "")
    )
    pub_date = content.get("pubDate", "")

    thumbnail = None
    thumb = content.get("thumbnail") or {}
    resolutions = thumb.get("resolutions") or []
    for res in resolutions:
        if res.get("tag") == "170x128":
            thumbnail = res.get("url")
            break
    if not thumbnail and resolutions:
        thumbnail = resolutions[0].get("url")
    if not thumbnail:
        thumbnail = thumb.get("originalUrl")

    tickers = _suggest_tickers(title + " " + summary) or [fallback_ticker]
    sentiment = _financial_sentiment(title + " " + summary)

    return {
        "uuid": item.get("id") or item.get("uuid", ""),
        "title": title,
        "publisher": publisher,
        "link": link,
        "published_at": pub_date,
        "related_tickers": tickers,
        "thumbnail": thumbnail,
        "sentiment": sentiment,
    }


def _fetch_ticker_news(symbol: str) -> list[dict]:
    try:
        news = yf.Ticker(symbol).news or []
        articles = []
        for item in news[:8]:
            parsed = _parse_article(item, symbol)
            if parsed:
                articles.append(parsed)
        return articles
    except Exception:
        return []


@router.get("/market")
async def get_market_news():
    key = "news:market"
    hit = cache.get(key)
    if hit:
        return hit

    seen_uuids: set[str] = set()
    all_news: list[dict] = []

    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(_fetch_ticker_news, t): t for t in MARKET_NEWS_TICKERS}
        for f in as_completed(futures):
            for item in f.result():
                if item["uuid"] not in seen_uuids:
                    seen_uuids.add(item["uuid"])
                    all_news.append(item)

    all_news.sort(key=lambda a: a.get("published_at", ""), reverse=True)
    result = {"articles": all_news[:30]}
    cache.set(key, result, ttl=300)
    return result


@router.get("/{ticker}")
async def get_ticker_news(ticker: str):
    key = f"news:{ticker.upper()}"
    hit = cache.get(key)
    if hit:
        return hit

    articles = _fetch_ticker_news(ticker.upper())
    result = {"ticker": ticker.upper(), "articles": articles}
    cache.set(key, result, ttl=300)
    return result
