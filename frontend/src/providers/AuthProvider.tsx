'use client'

/**
 * Auth state for the whole app.
 *
 * Token storage strategy: the access token lives ONLY in memory (React
 * state + the module-level var in lib/api.ts) -- never localStorage --
 * to limit exposure if an XSS bug ever leaked JS-readable storage. The
 * refresh token is persisted in localStorage so a page reload doesn't
 * force a fresh login; on mount, if a stored refresh token exists, we
 * silently exchange it for a new access token before rendering the app.
 *
 * This is a pragmatic middle ground for a plain SPA with no server-side
 * session component (no httpOnly-cookie refresh flow) -- documented
 * trade-off, not an oversight.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, ApiError, setAccessToken, setAuthFailureHandler, setRefreshHandler } from '@/lib/api'
import type { MeResponse } from '@/lib/types'

const REFRESH_TOKEN_KEY = 'cf-refresh-token'

interface AuthState {
  user: MeResponse | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ mfaRequired: false } | { mfaRequired: true; mfaToken: string }>
  completeMfa: (mfaToken: string, code: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (code: string) => boolean
}

const Ctx = createContext<AuthState | null>(null)

function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

function storeRefreshToken(token: string | null) {
  try {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token)
    else localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    /* localStorage unavailable (private browsing, etc.) -- silent no-op,
       the app still works, just without persisted sessions. */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    setAccessToken(null)
    storeRefreshToken(null)
    setUser(null)
  }, [])

  const applyTokens = useCallback(async (access_token: string, refresh_token: string) => {
    setAccessToken(access_token)
    storeRefreshToken(refresh_token)
    const me = await api.auth.me()
    setUser(me)
  }, [])

  const doRefresh = useCallback(async (): Promise<string | null> => {
    const stored = getStoredRefreshToken()
    if (!stored) return null
    try {
      const pair = await api.auth.refresh(stored)
      setAccessToken(pair.access_token)
      storeRefreshToken(pair.refresh_token)
      return pair.access_token
    } catch {
      clearSession()
      return null
    }
  }, [clearSession])

  // Wire api.ts's callbacks once.
  useEffect(() => {
    setRefreshHandler(doRefresh)
    setAuthFailureHandler(clearSession)
    return () => {
      setRefreshHandler(null)
      setAuthFailureHandler(null)
    }
  }, [doRefresh, clearSession])

  // Silent refresh on mount.
  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      const stored = getStoredRefreshToken()
      if (!stored) {
        setLoading(false)
        return
      }
      try {
        const pair = await api.auth.refresh(stored)
        if (cancelled) return
        await applyTokens(pair.access_token, pair.refresh_token)
      } catch {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.auth.login(email, password)
      if ('mfa_required' in result) {
        return { mfaRequired: true as const, mfaToken: result.mfa_token }
      }
      await applyTokens(result.access_token, result.refresh_token)
      return { mfaRequired: false as const }
    },
    [applyTokens],
  )

  const completeMfa = useCallback(
    async (mfaToken: string, code: string) => {
      const pair = await api.auth.mfaVerify(mfaToken, code)
      await applyTokens(pair.access_token, pair.refresh_token)
    },
    [applyTokens],
  )

  const logout = useCallback(async () => {
    const stored = getStoredRefreshToken()
    try {
      if (stored) await api.auth.logout(stored)
    } catch {
      /* best-effort -- clear local state regardless */
    }
    clearSession()
  }, [clearSession])

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.auth.me()
      setUser(me)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) clearSession()
    }
  }, [clearSession])

  const hasPermission = useCallback(
    (code: string) => !!user?.permissions.includes(code),
    [user],
  )

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, completeMfa, logout, refreshUser, hasPermission }),
    [user, loading, login, completeMfa, logout, refreshUser, hasPermission],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth() must be used within <AuthProvider>')
  return ctx
}
