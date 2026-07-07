/**
 * Next.js instrumentation hook (App Router, stable since Next.js 14 --
 * no `experimental.instrumentationHook` flag needed).
 *
 * The primary Datadog APM init mechanism for this app is
 * `NODE_OPTIONS="--require dd-trace/init"` on the `dev`/`start` scripts
 * (see package.json) -- that flag initializes the tracer before any
 * application module loads, which is earlier and more reliable than this
 * hook alone. This file is Datadog's documented belt-and-suspenders
 * addition for Next.js: some Next.js-managed child processes (build/route
 * workers) don't always inherit a parent's NODE_OPTIONS, so `register()`
 * re-initializes the tracer (idempotent -- safe to call more than once)
 * for the Node.js runtime specifically. The edge runtime is intentionally
 * skipped: dd-trace does not support it, and this app doesn't use it.
 *
 * No manual spans are created here or anywhere else -- this only turns on
 * auto-instrumentation.
 *
 * Production caveat: this app builds with `output: 'export'`
 * (next.config.mjs) -- production is a static export with NO running
 * Next.js server (FastAPI serves the exported files directly). This hook,
 * and NODE_OPTIONS in package.json, therefore only produce server-side APM
 * traces while a real Next.js server process is running -- i.e. `next dev`
 * today. Nothing here is static-export-specific or needs to be removed;
 * it's inert (never invoked) during a static export, and will start
 * producing traces with zero code changes if this project ever switches to
 * `next start` / SSR.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const tracer = await import('dd-trace')
    tracer.default.init()
  }
}
