'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { ApiError } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const { login, completeMfa } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await login(email, password)
      if (result.mfaRequired) {
        setMfaToken(result.mfaToken)
      } else {
        router.push('/')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleMfa(e: FormEvent) {
    e.preventDefault()
    if (!mfaToken) return
    setError(null)
    setBusy(true)
    try {
      await completeMfa(mfaToken, code.trim())
      router.push('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>
          Config<span className="accent">Foundry</span>
        </span>
      </div>

      <div className="card">
        <div className="card-header">
          <strong>{mfaToken ? 'Two-factor verification' : 'Sign in'}</strong>
        </div>
        <div className="card-body">
          {error && (
            <div className="banner banner-error" role="alert" style={{ marginBottom: 14 }}>
              {error}
            </div>
          )}

          {!mfaToken ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfa} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
                Enter the 6-digit code from your authenticator app, or a backup code.
              </p>
              <div className="field">
                <label className="field-label" htmlFor="mfa-code">
                  Verification code
                </label>
                <input
                  id="mfa-code"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Verifying…' : 'Verify'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => {
                  setMfaToken(null)
                  setCode(null as unknown as string)
                  setCode('')
                  setError(null)
                }}
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
