import { useState, useEffect, useRef, useCallback } from 'react' // useRef still used by pollRef
import {
  OBSERVER_ENDPOINTS,
  OBSERVER_CONFIG,
  isAuthenticated,
  storeAuth,
} from '../lib/observer-auth'
import styles from './AuthGate.module.css'

function QRCode({ data, size = 200 }: { data: string; size?: number }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
  return <img src={src} width={size} height={size} alt="QR Code" className={styles.qrCanvas} />
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [status, setStatus] = useState<'checking' | 'idle' | 'waiting' | 'approved' | 'expired' | 'fallback'>('checking')
  const [accessCode, setAccessCode] = useState('')
  const [accessError, setAccessError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isAuthenticated()) {
      setStatus('approved')
    } else if (localStorage.getItem('klaus_auth')) {
      setStatus('approved')
    } else {
      // Auto-start Observer session so code shows immediately
      startLogin()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startLogin = useCallback(async () => {
    try {
      const res = await fetch(OBSERVER_ENDPOINTS.START, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      setSessionId(data.session_id)
      setCode(data.code)
      setStatus('waiting')

      pollRef.current = setInterval(async () => {
        try {
          const check = await fetch(OBSERVER_ENDPOINTS.CHECK(data.session_id))
          const result = await check.json()

          if (result.status === 'approved') {
            storeAuth(result.device_id || data.session_id)
            setStatus('approved')
            if (pollRef.current) clearInterval(pollRef.current)
          } else if (result.status === 'expired' || result.status === 'not_found') {
            setStatus('expired')
            if (pollRef.current) clearInterval(pollRef.current)
          }
        } catch {
          // Keep polling on network errors
        }
      }, OBSERVER_CONFIG.POLL_INTERVAL_MS)
    } catch (err: any) {
      // Observer unavailable — show fallback access code
      console.warn('Observer Auth unavailable, showing fallback:', err.message)
      setStatus('fallback')
    }
  }, [])

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const reset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    setSessionId(null)
    setCode(null)
    setStatus('idle')
  }, [])

  const handleAccessCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (accessCode.trim() === 'vaultkey') {
      localStorage.setItem('klaus_auth', accessCode.trim())
      setStatus('approved')
    } else {
      setAccessError('Invalid access code')
    }
  }

  if (status === 'approved') return <>{children}</>

  if (status === 'checking') return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.spinner} />
        <p className={styles.checkingText}>Checking authorization...</p>
      </div>
    </div>
  )

  const qrUrl = sessionId ? OBSERVER_ENDPOINTS.SCAN(sessionId) : ''

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoK}>K</span>
        </div>
        <h1 className={styles.title}>KLAUS SYSTEMS</h1>
        <p className={styles.subtitle}>IMI Research Intelligence Platform</p>

        {status === 'idle' && (
          <div className={styles.section}>
            <button onClick={startLogin} className={styles.primaryButton}>
              Sign In with Observer
            </button>
            <button onClick={() => setStatus('fallback')} className={styles.linkButton}>
              Use access code instead
            </button>
          </div>
        )}

        {status === 'waiting' && code && sessionId && (
          <div className={styles.section}>
            <div className={styles.toggleRow}>
              <button
                onClick={() => setShowQR(false)}
                className={`${styles.toggleBtn} ${!showQR ? styles.toggleActive : ''}`}
              >
                Manual Code
              </button>
              <button
                onClick={() => setShowQR(true)}
                className={`${styles.toggleBtn} ${showQR ? styles.toggleActive : ''}`}
              >
                QR Code
              </button>
            </div>

            {!showQR ? (
              <>
                <p className={styles.hint}>Enter this code on your phone:</p>
                <div className={styles.bigCode}>{code}</div>
                <p className={styles.codeHint}>
                  Or switch to <span className={styles.codeInline}>QR Code</span> to scan
                </p>
              </>
            ) : (
              <>
                <p className={styles.hint}>Scan with your phone camera:</p>
                <div className={styles.qrWrap}>
                  <QRCode data={qrUrl} size={200} />
                </div>
              </>
            )}

            <div className={styles.pollingIndicator}>
              <span className={styles.pulseDot} />
              Waiting for approval...
            </div>

            <button onClick={reset} className={styles.linkButton}>Cancel</button>
          </div>
        )}

        {status === 'expired' && (
          <div className={styles.section}>
            <div className={styles.expiredBox}>
              <p className={styles.expiredTitle}>Code Expired</p>
              <p className={styles.hint}>The authentication code has expired.</p>
            </div>
            <button onClick={reset} className={styles.secondaryButton}>Try Again</button>
          </div>
        )}

        {status === 'fallback' && (
          <div className={styles.section}>
            <form onSubmit={handleAccessCode} className={styles.form}>
              <input
                type="password"
                value={accessCode}
                onChange={e => { setAccessCode(e.target.value); setAccessError('') }}
                placeholder="Access code"
                className={styles.input}
                autoFocus
              />
              {accessError && <p className={styles.error}>{accessError}</p>}
              <button type="submit" className={styles.primaryButton}>Authenticate</button>
            </form>
            <button onClick={() => setStatus('idle')} className={styles.linkButton}>
              Back to Observer
            </button>
          </div>
        )}

        <p className={styles.powered}>Powered by AXE Technology</p>
      </div>
    </div>
  )
}
