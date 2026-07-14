"""
``PlatformAdapter`` -- the contract every monitoring platform integration
implements. This replaces the earlier "Exporter" abstraction (ADR-0008).

Only ``generate()`` is required to actually do something in this release.
``validate()`` / ``deploy()`` / ``verify()`` / ``import_config()`` /
``rollback()`` are part of the interface now -- so the contract doesn't
change shape when a future release implements them -- but default to
returning a ``CapabilityResult(implemented=False)`` rather than raising.

A note on naming: Python reserves ``NotImplemented`` for binary-operator
overloading, not as a general-purpose "not implemented yet" sentinel (most
style guides flag using it outside that context, and type-checkers give it
special-cased, operator-only typing). ``CapabilityResult`` is the idiomatic
equivalent here -- a plain, inspectable result object, in the same
"no side effects, plain data" style ``core/validator.py`` already uses for
findings.

``PlatformAdapter.validate()`` is reserved for a *platform-specific*
validation pass in the future (e.g. "does this Datadog API key have the
right scopes"). It is deliberately separate from ``core/validator.py``'s
inventory validation, which is a single vendor-neutral engine that always
runs upstream of any Platform Adapter, unchanged by any of this.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Union

from core.domain.models import MonitoringConfiguration


@dataclass(frozen=True)
class PlatformInfo:
    """Shape returned by GET /api/v1/platforms for one platform (see
    api/v1/platforms.py). Field names here are the internal, Pythonic
    ones -- the route is responsible for the camelCase JSON keys the
    frontend consumes, matching this API's existing convention."""
    id: str
    name: str
    status: str                       # "supported" | "coming_soon"
    description: str = ""
    version: Optional[str] = None
    icon: str = ""
    supports_generation: bool = False
    supports_deployment: bool = False
    supports_validation: bool = False
    supports_verification: bool = False


@dataclass(frozen=True)
class GenerateResult:
    """Output of PlatformAdapter.generate(). Deliberately minimal --
    everything that's true regardless of which platform was chosen
    (findings, group stats, skipped/invalid/orphaned device counts) lives
    on MonitoringConfiguration itself and is assembled by the caller
    (core/services/generate_service.py), not duplicated here."""
    files: dict                       # rendered filename -> text content
    summary: str


@dataclass(frozen=True)
class CapabilityResult:
    """Returned by any capability a platform hasn't implemented yet."""
    capability: str
    implemented: bool = False
    detail: str = field(default="")


class PlatformAdapter(ABC):
    """Base class every monitoring platform integration extends."""

    id: str
    name: str
    version: str
    status: str

    @abstractmethod
    def info(self) -> PlatformInfo:
        """Static metadata for GET /platforms. Must not touch the DB or
        do any inventory work -- this is called once per registry list,
        cheaply, regardless of whether the platform is ever used. This is
        the only method every platform -- even "coming soon" stubs -- must
        implement, since the registry needs it to build the card grid."""
        raise NotImplementedError

    # -- Only Generate() is implemented this release, and only by Datadog.
    # Every other adapter (Prometheus, Zabbix) inherits this default and
    # returns a CapabilityResult, same as the reserved methods below --
    # generate_service.py checks for that before attempting to render or
    # persist history.

    def generate(self, config: MonitoringConfiguration) -> Union[GenerateResult, CapabilityResult]:
        """Map `config` into this platform's own Platform Model, render
        it, and return the result. Must not mutate `config`."""
        return CapabilityResult(capability="generate")

    # -- Reserved for future capability; default = not implemented yet. --

    def validate(self, config: MonitoringConfiguration) -> CapabilityResult:
        return CapabilityResult(capability="validate")

    def deploy(self, config: MonitoringConfiguration) -> CapabilityResult:
        return CapabilityResult(capability="deploy")

    def verify(self) -> CapabilityResult:
        return CapabilityResult(capability="verify")

    def import_config(self, source) -> CapabilityResult:
        return CapabilityResult(capability="import")

    def rollback(self, snapshot_id: str) -> CapabilityResult:
        return CapabilityResult(capability="rollback")
