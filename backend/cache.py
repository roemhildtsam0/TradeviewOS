import time
from typing import Any, Optional


class TTLCache:
    def __init__(self):
        self._store: dict = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expiry = entry
        if time.time() > expiry:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl: int = 60) -> None:
        self._store[key] = (value, time.time() + ttl)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    def clear_expired(self) -> None:
        now = time.time()
        self._store = {k: v for k, v in self._store.items() if v[1] > now}


cache = TTLCache()
