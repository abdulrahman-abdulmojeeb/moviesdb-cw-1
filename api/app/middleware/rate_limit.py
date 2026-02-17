"""
Rate limiting middleware for API protection.

This provides a simple in-memory rate limiter. For production with multiple
workers, consider using Redis-based rate limiting.
"""

import time
from collections import defaultdict
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple rate limiting middleware using a sliding window algorithm.

    Rate limits are applied per client IP address.
    """

    def __init__(
        self,
        app,
        requests_per_minute: int = 60,
        requests_per_second: int = 10,
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_second = requests_per_second
        # Store request timestamps per IP
        self._requests: dict[str, list[float]] = defaultdict(list)
        # Last cleanup time
        self._last_cleanup = time.time()

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request."""
        # Check for X-Forwarded-For header (behind proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        # Fall back to direct client IP
        return request.client.host if request.client else "unknown"

    def _cleanup_old_requests(self, now: float) -> None:
        """Remove requests older than 1 minute."""
        # Only cleanup every 30 seconds to avoid overhead
        if now - self._last_cleanup < 30:
            return

        cutoff = now - 60
        for ip in list(self._requests.keys()):
            self._requests[ip] = [t for t in self._requests[ip] if t > cutoff]
            if not self._requests[ip]:
                del self._requests[ip]
        self._last_cleanup = now

    def _is_rate_limited(self, client_ip: str) -> tuple[bool, str]:
        """
        Check if client is rate limited.

        Returns:
            Tuple of (is_limited, reason)
        """
        now = time.time()
        self._cleanup_old_requests(now)

        timestamps = self._requests[client_ip]

        # Check per-second limit
        one_second_ago = now - 1
        recent_requests = sum(1 for t in timestamps if t > one_second_ago)
        if recent_requests >= self.requests_per_second:
            return True, f"Rate limit exceeded: {self.requests_per_second} requests per second"

        # Check per-minute limit
        one_minute_ago = now - 60
        minute_requests = sum(1 for t in timestamps if t > one_minute_ago)
        if minute_requests >= self.requests_per_minute:
            return True, f"Rate limit exceeded: {self.requests_per_minute} requests per minute"

        return False, ""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and apply rate limiting."""
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/"]:
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        is_limited, reason = self._is_rate_limited(client_ip)

        if is_limited:
            return JSONResponse(
                status_code=429,
                content={"detail": reason},
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                },
            )

        # Record this request
        self._requests[client_ip].append(time.time())

        # Add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, self.requests_per_minute - len(self._requests[client_ip]))
        )

        return response
