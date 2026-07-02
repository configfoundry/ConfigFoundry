"""
IP address / CIDR handling for the Access Policy Engine.

Two responsibilities:
1. ``resolve_client_ip`` -- figure out the "real" client IP for a request,
   trusting X-Forwarded-For only when the immediate connecting peer is a
   configured trusted proxy (reverse proxy / load balancer). Blindly
   trusting X-Forwarded-For lets any client spoof their source IP and
   bypass IP allow/deny rules entirely, so this is the one place in the
   security layer that gets this specifically wrong if done carelessly.
2. ``ip_in_any_cidr`` -- CIDR matching for allow/deny lists and API-key IP
   restrictions, supporting IPv4 and IPv6 via the stdlib ``ipaddress``
   module (no extra dependency).
"""
from __future__ import annotations

import ipaddress
from typing import Optional, Sequence


def _parse_ip(value: str) -> Optional[ipaddress._BaseAddress]:
    try:
        return ipaddress.ip_address(value.strip())
    except ValueError:
        return None


def _parse_network(cidr: str) -> Optional[ipaddress._BaseNetwork]:
    try:
        return ipaddress.ip_network(cidr.strip(), strict=False)
    except ValueError:
        return None


def is_valid_cidr(cidr: str) -> bool:
    """True if *cidr* parses as a valid IPv4/IPv6 network or bare address."""
    return _parse_network(cidr) is not None


def ip_in_any_cidr(ip_str: str, cidrs: Sequence[str]) -> bool:
    """True if ip_str falls inside any of the given CIDR ranges (or exact
    IPs, which are treated as /32 or /128)."""
    ip = _parse_ip(ip_str)
    if ip is None:
        return False
    for cidr in cidrs:
        net = _parse_network(cidr)
        if net is not None and ip in net:
            return True
    return False


def resolve_client_ip(
    *,
    direct_peer_ip: str,
    forwarded_for_header: Optional[str],
    trusted_proxies: Sequence[str],
) -> str:
    """
    Resolve the real client IP.

    If ``direct_peer_ip`` (the TCP connection's actual remote address) is
    NOT in ``trusted_proxies``, the connection itself is the source of
    truth and any X-Forwarded-For header is ignored (an untrusted client
    cannot claim to be someone else).

    If it IS a trusted proxy, take the left-most address in
    X-Forwarded-For (the original client, per convention -- proxies append
    to the right as a request hops through them) and validate it parses as
    an IP; fall back to the direct peer if the header is missing/malformed.
    """
    if not trusted_proxies or not ip_in_any_cidr(direct_peer_ip, trusted_proxies):
        return direct_peer_ip

    if not forwarded_for_header:
        return direct_peer_ip

    candidate = forwarded_for_header.split(",")[0].strip()
    return candidate if _parse_ip(candidate) is not None else direct_peer_ip
