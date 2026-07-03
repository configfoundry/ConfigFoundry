"""Pydantic v2 schemas for the authentication / RBAC / policy REST API.
Follows the same conventions as schemas/common.py, but auth request bodies
use explicit required fields (not FlexModel) since malformed credentials
should 422 before touching AuthService at all."""
from __future__ import annotations

import re
from typing import Annotated, Optional

from pydantic import AfterValidator, BaseModel, ConfigDict, Field

# Deliberately NOT pydantic's EmailStr: it rejects reserved/special-use
# TLDs (.local, .internal, .test, .lan) via python-email-validator's
# deliverability checks -- which would reject ConfigFoundry's own default
# bootstrap admin address ("admin@configfoundry.local") and any other
# purely-internal self-hosted deployment naming. This is a light syntactic
# check only; real validation is "does this account exist and does the
# password match."
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(v: str) -> str:
    v = (v or "").strip().lower()
    if not _EMAIL_RE.match(v) or len(v) > 254:
        raise ValueError("Not a valid email address")
    return v


EmailStr = Annotated[str, AfterValidator(_validate_email)]


class FlexModel(BaseModel):
    model_config = ConfigDict(extra="allow")


# ---------------------------------------------------------------------------
# Login / tokens / MFA
# ---------------------------------------------------------------------------

class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class MfaVerifyBody(BaseModel):
    mfa_token: str
    code: str = Field(min_length=6, max_length=12)


class RefreshBody(BaseModel):
    refresh_token: str


class ChangePasswordBody(BaseModel):
    old_password: str
    new_password: str = Field(min_length=1, max_length=256)


class MfaEnrollConfirmBody(BaseModel):
    secret: str
    code: str = Field(min_length=6, max_length=6)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class CreateUserBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)
    full_name: Optional[str] = None


class UpdateUserBody(FlexModel):
    full_name: Optional[str] = None
    username: Optional[str] = None


class AssignRoleBody(BaseModel):
    role_id: str


class AdminResetPasswordBody(BaseModel):
    new_password: str = Field(min_length=1, max_length=256)


# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------

class CreateRoleBody(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: list[str] = Field(default_factory=list)


class UpdateRolePermissionsBody(BaseModel):
    permissions: list[str]


# ---------------------------------------------------------------------------
# API keys
# ---------------------------------------------------------------------------

class CreateAPIKeyBody(BaseModel):
    name: str
    permissions: list[str] = Field(default_factory=list)
    allowed_ips: list[str] = Field(default_factory=list)
    environment: str = "production"
    expires_at: Optional[float] = None


# ---------------------------------------------------------------------------
# Network ACLs (Access Policy Engine)
# ---------------------------------------------------------------------------

class CreateNetworkACLBody(BaseModel):
    rule_type: str = Field(pattern="^(allow|deny)$")
    cidr: str
    description: Optional[str] = None
    priority: int = 100


class ErrorResponse(FlexModel):
    error: str
