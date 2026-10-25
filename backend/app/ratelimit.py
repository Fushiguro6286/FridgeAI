import threading
import time
from collections import defaultdict, deque

from app.errors import AppError


class RateLimiter:
    """Sliding-window limiter.

    shortcut: in-process memory, so limits are per worker and reset on restart;
    move to Redis if you run several workers/instances.
    """

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window: float = 60.0) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                raise AppError(429, "rate_limited", "Too many requests. Please wait a minute and try again.")
            q.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()
