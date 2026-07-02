"""
ConfigFoundry authentication & security layer.

Sub-modules
-----------
``config``       SecurityConfig — all auth/security settings, env-driven.
``password``     Argon2id hashing + NIST 800-63B-style strength validation.
``jwt_tokens``   JWT access-token encode/decode/rotation.
``tokens``       Opaque token generation + constant-time hashing helpers
                  (refresh tokens, API keys, backup codes).
``crypto``       Audited AES-256-GCM (via the ``cryptography`` package) for
                  encrypting secrets at rest (MFA seeds). Deliberately does
                  NOT reuse core/aesgcm.py — see that module's docstring.
``mfa``          TOTP enrollment/verification helpers (RFC 6238).
``ip``           CIDR matching + trusted-proxy-aware client IP resolution.
``rate_limit``   In-memory sliding-window rate limiter.
``middleware``   Starlette middleware: trusted proxy, access policy,
                  security headers, rate limiting.

Nothing in this package talks to a database directly — persistence goes
through ``core/repositories`` and ``core/services`` as usual. This package
is pure security logic + configuration.
"""
