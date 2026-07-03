"""
Authentication service -- login, token refresh/rotation, logout, password
management.

Every method that can fail on bad input raises ``AuthError`` (or the more
specific ``AccountLockedError`` / ``MFARequiredError``) rather than
returning a bare None/False, so callers (the API layer) get a single place
to translate failures into consistent HTTP responses, and so every failure
path is forced to go through the audit-logging calls in this service
rather than being logged inconsistently at the route layer.

Security notes
---------------
* Login failures for "no such user" and "wrong password" produce the
  identical error message and audit action -- never reveal which is
  wrong (user enumeration protection).
* Refresh-token reuse (a token already marked revoked/replaced being
  presented again) revokes the ENTIRE token family immediately -- the
  standard response to suspected token theft (OAuth 2.0 Security BCP).
* Password changes and forced logout bump ``perm_version``, which makes
  already-issued access tokens stop being honored well before their
  natural expiry (see core/security/jwt_tokens.py docstring).
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from typing import Optional

from core.repositories.interfaces import (
    IAuditRepository,
    IRefreshTokenRepository,
    IUserRepository,
)
from core.security import jwt_tokens, password as password_mod, tokens
from core.security.config import SecurityConfig


class AuthError(Exception):
    """Generic authentication failure -- safe, generic message for clients."""


class AccountLockedError(AuthError):
    pass


class MFARequiredError(Exception):
    """Not a failure -- signals the caller to prompt for a TOTP/backup code."""

    def __init__(self, mfa_token: str):
        super().__init__("MFA verification required")
        self.mfa_token = mfa_token


@dataclass
class TokenPair:
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 0


@dataclass
class RequestContext:
    """Everything about the calling request that audit entries want."""
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None
    correlation_id: Optional[str] = None


class AuthService:
    """
    Note on role assignment: ``create_user`` deliberately does NOT assign
    any default role. New accounts hold zero permissions until an admin
    explicitly grants one via ``UserService.assign_role`` -- consistent
    with the fine-grained, explicit-opt-in RBAC model (no implicit access
    "just because an account exists").
    """

    def __init__(
        self,
        user_repo: IUserRepository,
        refresh_token_repo: IRefreshTokenRepository,
        audit_repo: IAuditRepository,
        config: SecurityConfig,
    ) -> None:
        self._user_repo = user_repo
        self._refresh_repo = refresh_token_repo
        self._audit_repo = audit_repo
        self._config = config

    # ------------------------------------------------------------------
    # Registration (admin-invite model -- see docs/authentication.md for
    # why this isn't open self-registration)
    # ------------------------------------------------------------------

    def create_user(
        self,
        *,
        org_id: str,
        email: str,
        password: str,
        full_name: Optional[str],
        actor_id: Optional[str],
        ctx: RequestContext,
        must_change_password: bool = True,
    ) -> dict:
        existing = self._user_repo.get_by_email(email)
        if existing:
            raise AuthError("A user with this email already exists")

        check = password_mod.validate_password_strength(
            password, self._config, user_inputs=[email, full_name or ""]
        )
        if not check.valid:
            raise AuthError("; ".join(check.errors))

        hashed = password_mod.hash_password(password, self._config)
        user = self._user_repo.create(
            {
                "org_id": org_id,
                "email": email,
                "full_name": full_name,
                "hashed_password": hashed,
                "must_change_password": must_change_password,
            }
        )
        self._audit_repo.log(
            actor_id, "user.created", {"email": email},
            org_id=org_id, actor_type="user" if actor_id else "system",
            source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="user", resource_id=user["id"], result="success",
            correlation_id=ctx.correlation_id,
        )
        return user

    # ------------------------------------------------------------------
    # Login
    # ------------------------------------------------------------------

    def login(self, email: str, plain_password: str, ctx: RequestContext) -> TokenPair:
        user = self._user_repo.get_by_email(email)

        if user is None:
            self._audit_repo.log(
                email, "auth.login", {"reason": "no_such_user"},
                actor_type="user", source_ip=ctx.source_ip, user_agent=ctx.user_agent,
                resource_type="user", result="failure", correlation_id=ctx.correlation_id,
            )
            raise AuthError("Invalid email or password")

        now = time.time()
        if user["locked_until"] and user["locked_until"] > now:
            self._audit_repo.log(
                user["id"], "auth.login", {"reason": "locked"},
                org_id=user["org_id"], actor_type="user",
                source_ip=ctx.source_ip, user_agent=ctx.user_agent,
                resource_type="user", resource_id=user["id"], result="denied",
                correlation_id=ctx.correlation_id,
            )
            raise AccountLockedError(
                "Account temporarily locked due to repeated failed login attempts"
            )

        if not user["is_active"] or not password_mod.verify_password(
            plain_password, user["hashed_password"]
        ):
            self._register_failed_login(user, ctx)
            raise AuthError("Invalid email or password")

        # Success -------------------------------------------------------
        self._user_repo.reset_failed_login(user["id"])
        if password_mod.needs_rehash(user["hashed_password"], self._config):
            self._user_repo.update(
                user["id"], {"hashed_password": password_mod.hash_password(plain_password, self._config)}
            )

        if user["mfa_enabled"]:
            mfa_token = jwt_tokens.issue_mfa_pending_token(user["id"], self._config)
            self._audit_repo.log(
                user["id"], "auth.login.mfa_challenge", None,
                org_id=user["org_id"], actor_type="user",
                source_ip=ctx.source_ip, user_agent=ctx.user_agent,
                resource_type="user", resource_id=user["id"], result="success",
                correlation_id=ctx.correlation_id,
            )
            raise MFARequiredError(mfa_token)

        return self._complete_login(user, ctx)

    def complete_mfa_login(self, user_id: str, ctx: RequestContext) -> TokenPair:
        """Called by the API layer after MFAService confirms the TOTP/
        backup code was correct for the user_id encoded in the mfa_token."""
        user = self._user_repo.get(user_id)
        if user is None or not user["is_active"]:
            raise AuthError("Invalid or expired session")
        return self._complete_login(user, ctx)

    def _register_failed_login(self, user: dict, ctx: RequestContext) -> None:
        count = self._user_repo.increment_failed_login(user["id"])
        if count >= self._config.lockout_threshold:
            locked_until = time.time() + self._config.lockout_duration_minutes * 60
            self._user_repo.set_lock(user["id"], locked_until)
        self._audit_repo.log(
            user["id"], "auth.login", {"reason": "bad_password", "failed_count": count},
            org_id=user["org_id"], actor_type="user",
            source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="user", resource_id=user["id"], result="failure",
            correlation_id=ctx.correlation_id,
        )

    def _complete_login(self, user: dict, ctx: RequestContext) -> TokenPair:
        self._user_repo.touch_login(user["id"])
        pair = self._issue_token_pair(user, family_id=str(uuid.uuid4()), ctx=ctx)
        self._audit_repo.log(
            user["id"], "auth.login", None,
            org_id=user["org_id"], actor_type="user",
            source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="user", resource_id=user["id"], result="success",
            correlation_id=ctx.correlation_id,
        )
        return pair

    def _issue_token_pair(self, user: dict, family_id: str, ctx: RequestContext) -> TokenPair:
        access = jwt_tokens.issue_access_token(
            user_id=user["id"], org_id=user["org_id"],
            perm_version=user["perm_version"], config=self._config,
        )
        raw_refresh = tokens.generate_token()
        self._refresh_repo.create(
            {
                "user_id": user["id"],
                "token_hash": tokens.hash_token(raw_refresh),
                "family_id": family_id,
                "expires_at": time.time() + self._config.refresh_token_ttl_days * 86400,
                "source_ip": ctx.source_ip,
                "user_agent": ctx.user_agent,
            }
        )
        return TokenPair(
            access_token=access,
            refresh_token=raw_refresh,
            expires_in=self._config.access_token_ttl_minutes * 60,
        )

    # ------------------------------------------------------------------
    # Refresh (rotate-on-use + reuse detection)
    # ------------------------------------------------------------------

    def refresh(self, raw_refresh_token: str, ctx: RequestContext) -> TokenPair:
        stored = self._refresh_repo.get_by_hash(tokens.hash_token(raw_refresh_token))
        if stored is None:
            raise AuthError("Invalid refresh token")

        if stored["revoked_at"] is not None:
            # Token already used/revoked being presented again -> possible
            # theft. Nuke the whole family and force a fresh login.
            self._refresh_repo.revoke_family(stored["family_id"])
            self._audit_repo.log(
                stored["user_id"], "auth.refresh.reuse_detected", None,
                actor_type="user", source_ip=ctx.source_ip, user_agent=ctx.user_agent,
                resource_type="refresh_token", resource_id=stored["id"], result="denied",
                correlation_id=ctx.correlation_id,
            )
            raise AuthError("Refresh token reuse detected; all sessions have been revoked")

        if stored["expires_at"] < time.time():
            raise AuthError("Refresh token expired")

        user = self._user_repo.get(stored["user_id"])
        if user is None or not user["is_active"]:
            raise AuthError("Account no longer active")

        pair = self._issue_token_pair(user, family_id=stored["family_id"], ctx=ctx)
        self._refresh_repo.mark_replaced(
            stored["id"], tokens.hash_token(pair.refresh_token)
        )
        return pair

    # ------------------------------------------------------------------
    # Logout
    # ------------------------------------------------------------------

    def logout(self, raw_refresh_token: str, ctx: RequestContext) -> None:
        stored = self._refresh_repo.get_by_hash(tokens.hash_token(raw_refresh_token))
        if stored is None:
            return
        self._refresh_repo.revoke(stored["id"])
        self._audit_repo.log(
            stored["user_id"], "auth.logout", None,
            actor_type="user", source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="user", resource_id=stored["user_id"], result="success",
            correlation_id=ctx.correlation_id,
        )

    def logout_all(self, user_id: str, ctx: RequestContext) -> None:
        self._refresh_repo.revoke_all_for_user(user_id)
        self._user_repo.bump_perm_version(user_id)
        self._audit_repo.log(
            user_id, "auth.logout_all", None,
            actor_type="user", source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="user", resource_id=user_id, result="success",
            correlation_id=ctx.correlation_id,
        )

    # ------------------------------------------------------------------
    # Password management
    # ------------------------------------------------------------------

    def change_password(
        self, user_id: str, old_password: str, new_password: str, ctx: RequestContext
    ) -> None:
        user = self._user_repo.get(user_id)
        if user is None:
            raise AuthError("User not found")
        if not password_mod.verify_password(old_password, user["hashed_password"]):
            self._audit_repo.log(
                user_id, "auth.password_change", {"reason": "bad_old_password"},
                org_id=user["org_id"], actor_type="user",
                source_ip=ctx.source_ip, user_agent=ctx.user_agent,
                resource_type="user", resource_id=user_id, result="failure",
                correlation_id=ctx.correlation_id,
            )
            raise AuthError("Current password is incorrect")

        check = password_mod.validate_password_strength(
            new_password, self._config, user_inputs=[user["email"], user["full_name"] or ""]
        )
        if not check.valid:
            raise AuthError("; ".join(check.errors))

        self._user_repo.update(
            user_id,
            {
                "hashed_password": password_mod.hash_password(new_password, self._config),
                "must_change_password": False,
                "password_changed_at": time.time(),
            },
        )
        # Force re-authentication everywhere else -- a changed password
        # should invalidate every other session immediately.
        self._refresh_repo.revoke_all_for_user(user_id)
        self._user_repo.bump_perm_version(user_id)
        self._audit_repo.log(
            user_id, "auth.password_change", None,
            org_id=user["org_id"], actor_type="user",
            source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="user", resource_id=user_id, result="success",
            correlation_id=ctx.correlation_id,
        )

    def admin_reset_password(
        self, user_id: str, new_password: str, actor_id: str, ctx: RequestContext
    ) -> None:
        """An Org Admin / Super Admin resets another user's password (e.g.
        after account recovery outside this system). Forces a change on
        next login and revokes all existing sessions."""
        user = self._user_repo.get(user_id)
        if user is None:
            raise AuthError("User not found")
        check = password_mod.validate_password_strength(new_password, self._config)
        if not check.valid:
            raise AuthError("; ".join(check.errors))

        self._user_repo.update(
            user_id,
            {
                "hashed_password": password_mod.hash_password(new_password, self._config),
                "must_change_password": True,
                "password_changed_at": time.time(),
            },
        )
        self._refresh_repo.revoke_all_for_user(user_id)
        self._user_repo.bump_perm_version(user_id)
        self._audit_repo.log(
            actor_id, "auth.admin_password_reset", {"target_user": user_id},
            org_id=user["org_id"], actor_type="user",
            source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="user", resource_id=user_id, result="success",
            correlation_id=ctx.correlation_id,
        )
