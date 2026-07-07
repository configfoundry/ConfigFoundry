# ConfigFoundry — developer convenience targets
# Requires: python3, node, npm

.PHONY: help install install-backend install-frontend dev dev-backend dev-frontend \
        build serve test typecheck lint clean

# Load the single root .env (DD_* Datadog config, DATABASE_URL, etc.) into
# every recipe's environment. `-include` so a missing .env doesn't break
# targets that don't need it (e.g. `make help`).
-include .env
export

help:
	@echo ""
	@echo "  make install            Install both backend and frontend dependencies"
	@echo "  make install-backend    pip install -r requirements.txt -r requirements-dev.txt"
	@echo "  make install-frontend   Install Node dependencies (frontend/)"
	@echo "  make dev                Run backend + frontend dev servers in parallel"
	@echo "  make dev-backend        Run FastAPI on :8420 only"
	@echo "  make dev-frontend       Run Next.js dev server on :3001 only"
	@echo "  make build              Build Next.js static output → frontend/out/"
	@echo "  make serve              Build frontend + start FastAPI (single-port production)"
	@echo "  make test               Run the backend test suite (pytest)"
	@echo "  make typecheck          Typecheck the frontend (tsc --noEmit)"
	@echo "  make lint               Lint the frontend (next lint)"
	@echo "  make clean              Remove Next.js build artefacts"
	@echo ""

# ── install ──────────────────────────────────────────────────────────────────

install: install-backend install-frontend

install-backend:
	pip install -r requirements.txt -r requirements-dev.txt

install-frontend:
	cd frontend && npm install

# ── development ──────────────────────────────────────────────────────────────

# ddtrace-run enables Datadog APM auto-instrumentation (FastAPI/Starlette,
# SQLAlchemy, httpx/requests, stdlib logging) with zero manual span code.
# DD_SERVICE is the standard Datadog env var -- injected here (not in .env)
# because that file is shared with the frontend, which needs a different
# service name (see frontend/package.json).
dev-backend:
	DD_SERVICE=configfoundry-api ddtrace-run python3 server.py

dev-frontend:
	cd frontend && npm run dev

# Run both in parallel (requires GNU make or a POSIX shell that supports &)
dev:
	@echo "Starting backend on :8420 and Next.js dev server on :3001…"
	@trap 'kill 0' INT; \
	  DD_SERVICE=configfoundry-api ddtrace-run python3 server.py & \
	  (cd frontend && npm run dev) & \
	  wait

# ── production ───────────────────────────────────────────────────────────────

# Builds the Next.js static export. Self-healing: Next.js occasionally hits a
# known bug (https://github.com/vercel/next.js/issues) where a stale
# package-lock.json (its pinned @next/swc-* optional-dependency versions
# drift from the actually-installed `next` version) makes its internal
# lockfile auto-patcher crash with "Cannot read properties of undefined
# (reading 'os')". If that happens, regenerate node_modules + the lockfile
# from scratch and retry once, rather than leaving the developer to debug an
# unrelated tooling error.
build:
	@cd frontend && \
	LOG=$$(mktemp) && \
	npm run build >$$LOG 2>&1; STATUS=$$?; \
	cat $$LOG; \
	if [ $$STATUS -ne 0 ] && grep -qE "patch-incorrect-lockfile|Found lockfile missing swc dependencies" $$LOG; then \
		echo ""; \
		echo "==> Detected a stale package-lock.json (Next.js swc binaries out of sync with the installed next version)."; \
		echo "==> Regenerating node_modules and package-lock.json, then retrying the build..."; \
		rm -f $$LOG; \
		rm -rf node_modules package-lock.json && \
		npm install && \
		npm run build; \
	else \
		rm -f $$LOG; \
		exit $$STATUS; \
	fi

# Build the static frontend, then start FastAPI — everything on one port.
# (ddtrace-run — see dev-backend above for why.)
serve: build
	DD_SERVICE=configfoundry-api ddtrace-run python3 server.py

# ── quality ──────────────────────────────────────────────────────────────────

# Same command CI runs (backend-tests job) — see docs/development.md.
test:
	python3 -m pytest -q

typecheck:
	cd frontend && npx tsc --noEmit

# next lint (built into Next.js, no extra dependency) — no Python
# equivalent is configured on purpose; see docs/development.md#code-style.
lint:
	cd frontend && npm run lint

# ── clean ────────────────────────────────────────────────────────────────────

clean:
	rm -rf frontend/.next frontend/out
