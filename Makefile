# ConfigFoundry — developer convenience targets
# Requires: python3, node, npm

.PHONY: help dev-backend dev-frontend dev install-frontend build serve clean

help:
	@echo ""
	@echo "  make install-frontend   Install Node dependencies (frontend/)"
	@echo "  make dev                Run backend + frontend dev servers in parallel"
	@echo "  make dev-backend        Run FastAPI on :8420 only"
	@echo "  make dev-frontend       Run Next.js dev server on :3001 only"
	@echo "  make build              Build Next.js static output → frontend/out/"
	@echo "  make serve              Build frontend + start FastAPI (single-port production)"
	@echo "  make clean              Remove Next.js build artefacts"
	@echo ""

# ── install ──────────────────────────────────────────────────────────────────

install-frontend:
	cd frontend && npm install

# ── development ──────────────────────────────────────────────────────────────

dev-backend:
	python3 server.py

dev-frontend:
	cd frontend && npm run dev

# Run both in parallel (requires GNU make or a POSIX shell that supports &)
dev:
	@echo "Starting backend on :8420 and Next.js dev server on :3001…"
	@trap 'kill 0' INT; \
	  python3 server.py & \
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
serve: build
	python3 server.py

# ── clean ────────────────────────────────────────────────────────────────────

clean:
	rm -rf frontend/.next frontend/out
