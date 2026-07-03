#!/usr/bin/env python3
"""
validate_airgap.py — automated air-gap compliance checks for ConfigFoundry.

Run this after any dependency or frontend change, and in CI, to catch
anything that would break an air-gapped install. Exits non-zero (and
prints a clear reason) on the first category of failure; runs every
category and reports all failures before exiting, so a single run tells
you everything that's wrong rather than one problem at a time.

Checks performed:
  1. No CDN / remote-asset references in application source (frontend/src,
     app.py, core/, static/, templates) -- allows harmless exceptions
     (XML namespace URIs, clickable README/GitHub links) via an explicit
     allowlist, everything else fails the build.
  2. requirements.txt and requirements-dev.txt have every dependency
     pinned to an EXACT version (no >=, ~=, ^, or bare names).
  3. frontend/package.json has every dependency pinned to an EXACT
     version (no ^, ~, >, *, "latest").
  4. vendor/python/ contains wheels + a CHECKSUMS.sha256 manifest that
     actually matches the files on disk.
  5. FUNCTIONAL: `pip install --no-index --find-links vendor/python -r
     requirements.txt` actually succeeds into a throwaway virtualenv --
     this is the one check that can't lie, since --no-index makes pip
     structurally unable to reach PyPI even if the sandbox running this
     script happens to have network access.
  6. FUNCTIONAL: with that same throwaway virtualenv, actually import the
     application (`from app import create_app`) and construct it. A
     `pip install` can succeed while the app still fails to boot -- e.g.
     a new import added to the code without adding the package to
     requirements.txt. This is what catches that case before a release
     bundle ships with a package silently missing.

Usage:
    python3 scripts/validate_airgap.py
    python3 scripts/validate_airgap.py --skip-functional   # static checks only, fast

Exit code 0 = fully air-gap compliant. Non-zero = see printed failures.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import venv
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Allowlisted external-URL patterns that are NOT resource loads (clickable
# links, XML namespace identifiers that are never fetched, etc.) -- every
# other http(s):// reference found in application source fails the check.
# ---------------------------------------------------------------------------
ALLOWED_URL_SUBSTRINGS = [
    "www.w3.org",                     # XML/SVG namespace URIs, never fetched
    "schemas.openxmlformats.org",      # XLSX XML namespace URIs, never fetched
    "github.com",                       # clickable "GitHub" link in the UI footer
    "img.shields.io",                  # README badge images (GitHub-rendered only)
    "alembic.sqlalchemy.org",          # doc reference link, not fetched by the app
    "nextjs.org",                       # auto-generated comment in next-env.d.ts
    "docs.pytest.org",                  # pytest's own generated cache README
    "localhost",                        # documentation of default local URLs
]

# Vendored third-party libraries that legitimately contain XML-namespace-URI
# string literals (OOXML/ODF namespace identifiers baked into the library's
# own XML parsing/generation code) -- these are never fetched over the
# network, exactly like the w3.org/schemas.openxmlformats.org cases above,
# just too numerous per-file to allowlist individually.
ALLOWED_FILES = {
    "static/xlsx.full.min.js",  # SheetJS -- client-side Excel import/export
}

SOURCE_GLOBS = [
    "frontend/src/**/*.tsx",
    "frontend/src/**/*.ts",
    "frontend/src/**/*.css",
    "*.py",
    "core/**/*.py",
    "api/**/*.py",
    "static/**/*.html",
    "static/**/*.css",
    "static/**/*.js",
]
EXCLUDE_DIR_PARTS = {"node_modules", ".next", "out", "__pycache__", "vendor", ".venv", "static/vendor"}

URL_RE = re.compile(r"https?://[a-zA-Z0-9.\-]+")


class Result:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.passes: list[str] = []

    def ok(self, msg: str) -> None:
        self.passes.append(msg)
        print(f"  ✓ {msg}")

    def fail(self, msg: str) -> None:
        self.failures.append(msg)
        print(f"  ✗ {msg}", file=sys.stderr)


def check_no_external_urls(r: Result) -> None:
    print("\n== 1. No CDN / remote-asset references in application source ==")
    hits: list[str] = []
    for pattern in SOURCE_GLOBS:
        for path in REPO_ROOT.glob(pattern):
            if any(part in EXCLUDE_DIR_PARTS for part in path.parts):
                continue
            rel_str = str(path.relative_to(REPO_ROOT))
            if rel_str in ALLOWED_FILES:
                continue
            try:
                text = path.read_text(errors="ignore")
            except OSError:
                continue
            for m in URL_RE.finditer(text):
                url = m.group(0)
                if any(allowed in url for allowed in ALLOWED_URL_SUBSTRINGS):
                    continue
                rel = path.relative_to(REPO_ROOT)
                hits.append(f"{rel}: {url}")
    if hits:
        for h in hits:
            r.fail(f"external URL not in allowlist: {h}")
    else:
        r.ok("no un-allowlisted external URLs found in application source")


def check_requirements_pinned(r: Result) -> None:
    print("\n== 2. requirements.txt / requirements-dev.txt fully pinned ==")
    for fname in ["requirements.txt", "requirements-dev.txt"]:
        path = REPO_ROOT / fname
        if not path.exists():
            r.fail(f"{fname} not found")
            continue
        bad = []
        for line in path.read_text().splitlines():
            line = line.split("#", 1)[0].strip()
            if not line:
                continue
            # Strip environment markers (e.g. "; sys_platform != 'win32'")
            spec = line.split(";", 1)[0].strip()
            if not re.match(r"^[A-Za-z0-9_.\-]+(\[[A-Za-z0-9_,.\-]+\])?==[A-Za-z0-9_.\-]+$", spec):
                bad.append(line)
        if bad:
            for b in bad:
                r.fail(f"{fname}: not exactly pinned: {b}")
        else:
            r.ok(f"{fname}: every dependency exactly pinned")


def check_package_json_pinned(r: Result) -> None:
    print("\n== 3. frontend/package.json fully pinned ==")
    path = REPO_ROOT / "frontend" / "package.json"
    if not path.exists():
        r.fail("frontend/package.json not found")
        return
    data = json.loads(path.read_text())
    bad = []
    for section in ("dependencies", "devDependencies"):
        for name, spec in data.get(section, {}).items():
            if re.match(r"^[0-9]", spec) and not any(c in spec for c in "^~*>< x"):
                continue
            bad.append(f"{name}@{spec}")
    if bad:
        for b in bad:
            r.fail(f"frontend/package.json: not exactly pinned: {b}")
    else:
        r.ok("frontend/package.json: every dependency exactly pinned")


def check_wheelhouse_present(r: Result) -> None:
    print("\n== 4. vendor/python/ wheelhouse present and checksums match ==")
    vendor = REPO_ROOT / "vendor" / "python"
    wheels = sorted(vendor.glob("*.whl")) if vendor.is_dir() else []
    if not wheels:
        r.fail("vendor/python/ is missing or has no .whl files")
        return
    r.ok(f"vendor/python/ contains {len(wheels)} wheel(s)")

    checksums_path = vendor / "CHECKSUMS.sha256"
    if not checksums_path.exists():
        r.fail("vendor/python/CHECKSUMS.sha256 is missing")
        return
    expected = {}
    for line in checksums_path.read_text().splitlines():
        if not line.strip():
            continue
        digest, name = line.split(None, 1)
        expected[name.strip()] = digest.strip()
    mismatches = []
    for whl in wheels:
        actual = hashlib.sha256(whl.read_bytes()).hexdigest()
        if expected.get(whl.name) != actual:
            mismatches.append(whl.name)
    if mismatches:
        for m in mismatches:
            r.fail(f"checksum mismatch or missing entry: {m}")
    else:
        r.ok("all wheel checksums match CHECKSUMS.sha256")


def check_offline_pip_install(r: Result) -> None:
    print("\n== 5. FUNCTIONAL: pip install --no-index actually works ==")
    vendor = REPO_ROOT / "vendor" / "python"
    with tempfile.TemporaryDirectory() as tmp:
        venv_dir = Path(tmp) / "venv"
        venv.EnvBuilder(with_pip=True).create(venv_dir)
        python = venv_dir / "bin" / "python3"
        pip = venv_dir / "bin" / "pip"
        if not pip.exists():
            python = venv_dir / "Scripts" / "python.exe"  # Windows
            pip = venv_dir / "Scripts" / "pip.exe"
        proc = subprocess.run(
            [str(pip), "install", "--no-index", "--find-links", str(vendor),
             "-r", str(REPO_ROOT / "requirements.txt")],
            capture_output=True, text=True,
        )
        if proc.returncode != 0:
            r.fail("pip install --no-index failed:\n" + proc.stdout[-2000:] + proc.stderr[-2000:])
            return
        r.ok("pip install --no-index --find-links vendor/python succeeded")
        check_import_validation(r, python)


def check_import_validation(r: Result, python: Path) -> None:
    print("\n== 6. FUNCTIONAL: application imports and boots ==")
    probe = (
        "from app import create_app\n"
        "from core.storage.config import AppConfig\n"
        "import tempfile, os\n"
        "db_path = os.path.join(tempfile.mkdtemp(), 'airgap-import-check.db')\n"
        "app = create_app(config=AppConfig.for_sqlite(db_path))\n"
        "assert app is not None\n"
    )
    proc = subprocess.run(
        [str(python), "-c", probe],
        capture_output=True, text=True, cwd=str(REPO_ROOT),
    )
    if proc.returncode == 0:
        r.ok("application imports and constructs successfully from the offline install")
    else:
        r.fail(
            "application failed to import/boot from the offline install -- a required "
            "runtime package is likely missing from requirements.txt / vendor/python/:\n"
            + proc.stdout[-2000:] + proc.stderr[-2000:]
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-functional", action="store_true",
                         help="Skip the (slower) functional --no-index install check")
    args = parser.parse_args()

    print("=" * 70)
    print("  ConfigFoundry air-gap compliance validation")
    print("=" * 70)

    r = Result()
    check_no_external_urls(r)
    check_requirements_pinned(r)
    check_package_json_pinned(r)
    check_wheelhouse_present(r)
    if not args.skip_functional:
        check_offline_pip_install(r)

    print("\n" + "=" * 70)
    if r.failures:
        print(f"  FAILED: {len(r.failures)} check(s) failed, {len(r.passes)} passed.")
        print("=" * 70)
        return 1
    print(f"  PASSED: all {len(r.passes)} check(s) passed.")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
