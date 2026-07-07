const isProd = process.env.NODE_ENV === 'production'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for production — FastAPI serves frontend/out/ at /
  // In dev the Next.js server (port 3001) proxies /api/* to FastAPI (port 8420)
  output: isProd ? 'export' : undefined,
  trailingSlash: true,

  // rewrites() is incompatible with output:'export', so only used in dev
  ...(isProd
    ? {}
    : {
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: `http://localhost:${process.env.FASTAPI_PORT ?? 8420}/api/:path*`,
            },
          ]
        },
      }),

  // DocsContent.tsx intentionally does `await import(mermaidPackageName)`
  // with a variable specifier -- not a string literal -- so the build
  // doesn't hard-fail when the optional/vendored `mermaid` package isn't
  // present (see docs/airgap.md; the component falls back to plain-text
  // diagrams when it's missing). Webpack can't statically resolve a
  // variable import target, so it always emits a "Critical dependency:
  // the request of a dependency is an expression" warning for that line --
  // harmless noise, not a real error, and not fixable without abandoning
  // the optional-dependency pattern. Silencing it here so it doesn't spam
  // every dev-server compile.
  webpack: (config) => {
    config.module.exprContextCritical = false
    return config
  },
}

export default nextConfig
