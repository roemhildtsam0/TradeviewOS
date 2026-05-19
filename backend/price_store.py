import json
import os
from threading import Lock

_STORE_PATH = os.path.join(os.path.dirname(__file__), "price_store.json")
_lock = Lock()


def _load() -> dict:
    try:
        with open(_STORE_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save(ticker: str, data: dict) -> None:
    with _lock:
        store = _load()
        store[ticker] = data
        with open(_STORE_PATH, "w") as f:
            json.dump(store, f)


def get(ticker: str) -> dict | None:
    return _load().get(ticker)
