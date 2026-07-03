"""
Starlette middleware for the security layer.

Request pipeline (outer -> inner; see docs/authentication.md for the full
diagram)::

    SecurityHeadersMiddleware   (response headers, body-size guard)
        TrustedProxyMiddleware      (resolve real client IP)
            AccessPolicyMiddleware      (IP allow/deny -- runs BEFORE auth)
                RateLimitMiddleware          (per-IP request throttling)
                    CorrelationIDMiddleware      (existing)
                        RequestLoggingMiddleware     (existing)
                            route handlers -> FastAPI auth dependencies

All four classes here read configuration from ``request.app.state.container``
(``ServiceContainer``) rather than constructor arguments, since the
container already lives on ``app.state`` by the time any request is
served -- see app.py wiring order for why this holds even though
``add_middleware`` is called at import time.
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from core.logging.factory import get_logger
from core.security.ip import resolve_client_ip

_logger = get_logger("configfoundry.security")

# Paths that must always be reachable regardless of IP policy / rate limits
# -- API documentation is intentionally NOT exempted (it's still gated,
# consistent with "don't leak API shape to a denied network").
_ALWAYS_ALLOW_PREFIXES = ()

# FastAPI's built-in /docs and /redoc default to loading their JS/CSS from
# public CDNs (cdn.jsdelivr.net, fonts.googleapis.com). This app instead
# serves self-hosted, vendored copies of those assets (see app.py's custom
# /docs and /redoc routes + the static/vendor/docs/ directory) specifically
# so the CSP below can stay same-origin-only everywhere, with no
# CDN-allowlist carve-out and no runtime dependency on a third party being
# reachable.
_CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; "
    "connect-src 'self'; "
    "frame-ancestors 'none'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds baseline security response headers and rejects oversized
    request bodies early via Content-Length (best-effort -- a chunked
    request without Content-Length is not caught here; FastAPI/Starlette
    still bounds memory use when parsing bodies)."""

    async def dispatch(self, request: Request, call_next):
        container = getattr(request.app.state, "container", None)
        max_bytes = (
            container.security_config.max_request_body_bytes
            if container is not None
            else 10 * 1024 * 1024
        )
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > max_bytes:
                    return JSONResponse(
                        {"error": "Request body too large"}, status_code=413
                    )
            except ValueError:
                pass

        response: Response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # HSTS only makes sense once the deployment is actually served over
        # HTTPS (typically terminated at a reverse proxy in front of this
        # app) -- included unconditionally per the "HTTPS only" requirement;
        # it is a no-op / ignored by browsers over plain HTTP.
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        # Conservative baseline CSP for the served frontend. 'unsafe-inline'
        # on style-src is kept because the Next.js static export and the
        # legacy static/ UI both use some inline styles. 'unsafe-inline' on
        # script-src is also required: Next.js App Router's static export
        # embeds inline <script> tags with no `src` attribute (the RSC
        # hydration payload via self.__next_f.push(...), plus this app's own
        # early theme-detection bootstrap script in the root layout) --
        # without it, CSP silently blocks those scripts and the app never
        # hydrates (renders a blank page with no console-visible crash).
        # Tightened further (nonce/hash-based CSP) would require a
        # Next.js build-time nonce-injection step, out of scope here.
        # /docs and /redoc need no carve-out -- see _CSP above.
        response.headers["Content-Security-Policy"] = _CSP
        return response


class TrustedProxyMiddleware(BaseHTTPMiddleware):
    """Resolves the real client IP (trusting X-Forwarded-For only from a
    configured trusted proxy) and stores it on ``request.state.client_ip``
    for every downstream consumer (policy engine, rate limiter, audit
    log) -- see core/security/ip.py for why this matters."""

    async def dispatch(self, request: Request, call_next):
        container = getattr(request.app.state, "container", None)
        trusted_proxies = container.security_config.trusted_proxies if container else []
        direct_ip = request.client.host if request.client else "unknown"
        resolved = resolve_client_ip(
            direct_peer_ip=direct_ip,
            forwarded_for_header=request.headers.get("x-forwarded-for"),
            trusted_proxies=trusted_proxies,
        )
        request.state.client_ip = resolved
        return await call_next(request)


class AccessPolicyMiddleware(BaseHTTPMiddleware):
    """Access Policy Engine gate -- evaluated BEFORE authentication.
    Currently evaluates only global (org_id=None) rules at the HTTP layer,
    since the tenant isn't known until after auth resolves the caller;
    per-org policy is additionally re-checked once the org is known (see
    api/dependencies.py::get_current_user)."""

    async def dispatch(self, request: Request, call_next):
        if any(request.url.path.startswith(p) for p in _ALWAYS_ALLOW_PREFIXES):
            return await call_next(request)

        container = getattr(request.app.state, "container", None)
        if container is None:
            return await call_next(request)

        client_ip = getattr(request.state, "client_ip", None) or (
            request.client.host if request.client else "unknown"
        )
        decision = container.policy_engine.evaluate_ip(client_ip, org_id=None)
        if not decision.allowed:
            container.audit_repo.log(
                None, "policy.access_denied", {"path": request.url.path, "reason": decision.reason},
                actor_type="anonymous", source_ip=client_ip,
                user_agent=request.headers.get("user-agent"),
                resource_type="http_request", resource_id=request.url.path,
                result="denied",
            )
            return JSONResponse({"error": "Access denied by network policy"}, status_code=403)

        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-client-IP sliding-window rate limiting, with a stricter bucket
    for authentication endpoints (brute-force protection)."""

    _AUTH_PATH_PREFIXES = ("/api/v1/auth/login", "/api/v1/auth/mfa")

    async def dispatch(self, request: Request, call_next):
        container = getattr(request.app.state, "container", None)
        if container is None:
            return await call_next(request)

        config = container.security_config
        client_ip = getattr(request.state, "client_ip", None) or (
            request.client.host if request.client else "unknown"
        )

        is_auth_path = any(request.url.path.startswith(p) for p in self._AUTH_PATH_PREFIXES)
        spec = config.rate_limit_login if is_auth_path else config.rate_limit_default
        limit, window = config.parse_rate_limit(spec)
        bucket = "auth" if is_auth_path else "default"
        key = f"{bucket}:{client_ip}"

        if not container.rate_limiter.check(key, limit, window):
            container.audit_repo.log(
                None, "policy.rate_limited", {"path": request.url.path, "bucket": bucket},
                actor_type="anonymous", source_ip=client_ip,
                user_agent=request.headers.get("user-agent"),
                resource_type="http_request", resource_id=request.url.path,
                result="denied",
            )
            return JSONResponse(
                {"error": "Too many requests, please slow down"},
                status_code=429,
                headers={"Retry-After": str(window)},
            )

        return await call_next(request)
