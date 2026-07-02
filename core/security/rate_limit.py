"""
In-memory sliding-window rate limiter.

Deliberately dependency-free (no Redis) to match this project's minimal-
dependency posture. Trade-off, stated plainly: state is per-process, so if
ConfigFoundry is ever run as multiple replicas behind a load balancer
without sticky sessions, each replica enforces its own independent limit
(effective limit becomes count * replica_count). Fine for a single-process
deployment (the common case for this tool); documented in
docs/authentication.md as a known scaling limitation with the fix being to
swap this module's ``RateLimiter`` for a Redis-backed one behind the same
interface -- nothing else in the codebase would need to change.

Algorithm: fixed set of timestamps per key, pruned lazily on each check
(sliding-window log, not token bucket -- simpler and precise for the low
request rates this guards, e.g. login attempts).
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: int) -> bool:
        """
        Record a hit for *key* and return True if it is still within the
        limit, False if the limit has been exceeded (caller should reject
        the request, typically with HTTP 429).
        """
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            q = self._hits[key]
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            return True

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)

    def remaining(self, key: str, limit: int, window_seconds: int) -> int:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            q = self._hits[key]
            while q and q[0] < cutoff:
                q.popleft()
            return max(0, limit - len(q))


# NOTE: deliberately no process-wide singleton here. Each ServiceContainer
# owns its own RateLimiter instance (see core/container.py) so unrelated
# containers in the same process -- most notably every test that builds
# its own app -- don't share and exhaust the same buckets. Middleware
# reads the limiter via ``request.app.state.container.rate_limiter``.


# Process-wide singleton -- one shared limiter instance for all callers
# (middleware, login endpoint) so the same key space is enforced
# consistently. Safe under FastAPI's threadpool/async model thanks to the
# internal lock.
default_rate_limiter = RateLimiter()
