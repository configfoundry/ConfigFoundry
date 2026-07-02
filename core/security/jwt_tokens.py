"""
JWT access-token issuance and verification.

Access tokens are short-lived, stateless, and carry only what's needed to
authorize a request without a database round-trip: subject (user id), org
id, a permission-version stamp (see note below), and standard registered
claims (iat/exp/iss/jti). They are NOT used for anything long-lived or
revocable-by-itself -- that's what refresh tokens (core/security/tokens.py
+ the RefreshToken table) are for. Logout / role changes take effect within
one access-token lifetime (default 15 min), which is the standard trade-off
for stateless JWTs; shortening ``access_token_ttl_minutes`` tightens that
window.

``perm_version`` claim
-----------------------
A monotonically increasing integer stored on the User row. Bumped whenever
a user's roles/permissions change or an admin force-logs-out a user. The
authorization dependency compares the token's ``perm_version`` against the
current DB value and rejects stale tokens -- this is what makes role
changes and forced logout effective immediately instead of waiting for
token expiry, without needing a persistent access-token blacklist.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from typing import Optional

import jwt

from core.security.config import SecurityConfig


class TokenError(Exception):
    """Raised for any invalid/expired/malformed JWT."""


@dataclass
class AccessTokenClaims:
    sub: str                 # user id
    org_id: Optional[str]
    perm_version: int
    token_type: str          # "user" (human) or "service" (n/a for JWT today)
    jti: str
    iat: int
    exp: int


def issue_access_token(
    *,
    user_id: str,
    org_id: Optional[str],
    perm_version: int,
    config: SecurityConfig,
) -> str:
    now = int(time.time())
    exp = now + config.access_token_ttl_minutes * 60
    payload = {
        "sub": user_id,
        "org_id": org_id,
        "perm_version": perm_version,
        "token_type": "user",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": exp,
        "iss": config.jwt_issuer,
    }
    return jwt.encode(payload, config.jwt_secret, algorithm=config.jwt_algorithm)


def decode_access_token(token: str, config: SecurityConfig) -> AccessTokenClaims:
    try:
        payload = jwt.decode(
            token,
            config.jwt_secret,
            algorithms=[config.jwt_algorithm],
            issuer=config.jwt_issuer,
            options={"require": ["sub", "exp", "iat"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("access token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError(f"invalid access token: {exc}") from exc

    return AccessTokenClaims(
        sub=payload["sub"],
        org_id=payload.get("org_id"),
        perm_version=int(payload.get("perm_version", 0)),
        token_type=payload.get("token_type", "user"),
        jti=payload.get("jti", ""),
        iat=int(payload["iat"]),
        exp=int(payload["exp"]),
    )


# ---------------------------------------------------------------------------
# Short-lived "MFA pending" token
#
# Issued after a successful password check when the account has MFA
# enabled, in place of real access/refresh tokens. It proves "this caller
# already presented a correct password for this user" without granting any
# API access itself (get_current_user rejects token_type != "user") -- the
# second factor is required within its 5-minute window to complete login.
# ---------------------------------------------------------------------------

_MFA_PENDING_TTL_SECONDS = 300


def issue_mfa_pending_token(user_id: str, config: SecurityConfig) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "token_type": "mfa_pending",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + _MFA_PENDING_TTL_SECONDS,
        "iss": config.jwt_issuer,
    }
    return jwt.encode(payload, config.jwt_secret, algorithm=config.jwt_algorithm)


def decode_mfa_pending_token(token: str, config: SecurityConfig) -> str:
    """Returns the user_id if valid. Raises TokenError otherwise."""
    try:
        payload = jwt.decode(
            token,
            config.jwt_secret,
            algorithms=[config.jwt_algorithm],
            issuer=config.jwt_issuer,
            options={"require": ["sub", "exp", "iat"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("MFA challenge expired, please log in again") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError(f"invalid MFA token: {exc}") from exc

    if payload.get("token_type") != "mfa_pending":
        raise TokenError("not an MFA pending token")
    return payload["sub"]
