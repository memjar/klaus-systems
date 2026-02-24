import { useState, useEffect, useRef, useCallback } from 'react'
import {
  OBSERVER_ENDPOINTS,
  OBSERVER_CONFIG,
  isAuthenticated,
  storeAuth,
} from '../lib/observer-auth'
import styles from './AuthGate.module.css'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'idle' | 'waiting' | 'approved' | 'expired' | 'error' | 'fallback'>('checking')
  const [accessCode, setAccessCode] = useState('')
  const [accessError, setAccessError] = useState('')
  const [showFallback, setShowFallback] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>(localStorage.getItem('klaus_user') || '')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isAuthenticated() || localStorage.getItem('klaus_auth')) {
      setStatus('approved')
    } else {
      setStatus('idle')
    }
  }, [])

  const requestAccess = useCallback(async () => {
    if (!selectedUser) {
      setAccessError('SELECT A USER PROFILE')
      return
    }
    try {
      setStatus('waiting')
      localStorage.setItem('klaus_user', selectedUser)
      const res = await fetch(OBSERVER_ENDPOINTS.START, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: selectedUser, source: 'klaus.systems' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

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
        } catch { /* keep polling */ }
      }, OBSERVER_CONFIG.POLL_INTERVAL_MS)
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const reset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    setStatus('idle')
    setShowFallback(false)
  }, [])

  const handleAccessCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) {
      setAccessError('SELECT A USER PROFILE')
      return
    }
    if (accessCode.trim() === 'vaultkey') {
      localStorage.setItem('klaus_auth', accessCode.trim())
      localStorage.setItem('klaus_user', selectedUser)
      setStatus('approved')
    } else {
      setAccessError('ACCESS DENIED')
    }
  }

  if (status === 'approved') return <>{children}</>

  if (status === 'checking') return (
    <div className={styles.container}>
      <div className={styles.scanlines} />
      <div className={styles.card}>
        <div className={styles.spinner} />
        <p className={styles.mutedText}>INITIALIZING...</p>
      </div>
    </div>
  )

  return (
    <div className={styles.container}>
      <div className={styles.scanlines} />
      <div className={styles.gridBg} />

      <div className={styles.card}>
        {/* Terminal header */}
        <div className={styles.terminalBar}>
          <span className={styles.dot} data-color="red" />
          <span className={styles.dot} data-color="yellow" />
          <span className={styles.dot} data-color="green" />
          <span className={styles.terminalTitle}>klaus-auth</span>
        </div>

        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoOuter}>
            <div className={styles.logoInner}>K</div>
          </div>
          <h1 className={styles.title}>KLAUS SYSTEMS</h1>
          <div className={styles.tagline}>
            <span className={styles.tagBracket}>[</span>
            <span className={styles.tagText}>Intelligence Management Interface</span>
            <span className={styles.tagBracket}>]</span>
          </div>
        </div>

        {/* Status line */}
        <div className={styles.statusLine}>
          <span className={styles.statusDot} data-active={status === 'waiting' ? 'true' : 'false'} />
          <span className={styles.statusLabel}>
            {status === 'idle' && 'AWAITING AUTHENTICATION'}
            {status === 'waiting' && 'PUSH SENT — AWAITING APPROVAL'}
            {status === 'expired' && 'SESSION EXPIRED'}
            {status === 'error' && 'CONNECTION FAILED'}
          </span>
        </div>

        {/* User selector */}
        {(status === 'idle') && (
          <div className={styles.userSelector}>
            <span className={styles.userLabel}>SESSION PROFILE</span>
            <div className={styles.userToggle}>
              <button
                className={`${styles.userBtn} ${selectedUser === 'james' ? styles.userBtnActive : ''}`}
                onClick={() => { setSelectedUser('james'); setAccessError('') }}
              >
                James
              </button>
              <button
                className={`${styles.userBtn} ${selectedUser === 'mike' ? styles.userBtnActive : ''}`}
                onClick={() => { setSelectedUser('mike'); setAccessError('') }}
              >
                Mike
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className={styles.body}>
          {status === 'idle' && !showFallback && (
            <>
              <button onClick={requestAccess} className={styles.pushButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                PUSH TO DEVICE
              </button>
              <p className={styles.pushHint}>Sends approval request to authorized devices</p>
              <button onClick={() => setShowFallback(true)} className={styles.ghostButton}>
                enter access code
              </button>
            </>
          )}

          {status === 'idle' && showFallback && (
            <>
              <form onSubmit={handleAccessCode} className={styles.form}>
                <div className={styles.inputRow}>
                  <span className={styles.inputPrompt}>$</span>
                  <input
                    type="password"
                    value={accessCode}
                    onChange={e => { setAccessCode(e.target.value); setAccessError('') }}
                    placeholder="enter-access-code"
                    className={styles.input}
                    autoFocus
                  />
                </div>
                {accessError && <p className={styles.error}>{accessError}</p>}
                <button type="submit" className={styles.submitButton}>AUTHENTICATE</button>
              </form>
              <button onClick={() => setShowFallback(false)} className={styles.ghostButton}>
                back to push
              </button>
            </>
          )}

          {status === 'waiting' && (
            <>
              <div className={styles.rippleContainer}>
                <div className={styles.ripple} />
                <div className={styles.ripple} data-delay="1" />
                <div className={styles.ripple} data-delay="2" />
                <svg className={styles.bellIcon} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <p className={styles.waitingText}>Waiting for James or Mike...</p>
              <div className={styles.terminalLog}>
                <span className={styles.logLine}>&gt; push notification sent</span>
                <span className={styles.logLine}>&gt; polling for approval<span className={styles.cursor}>_</span></span>
              </div>
              <button onClick={reset} className={styles.ghostButton}>cancel</button>
            </>
          )}

          {status === 'expired' && (
            <>
              <div className={styles.errorBox}>
                <span className={styles.errorIcon}>!</span>
                <span>Session timed out. Request again.</span>
              </div>
              <button onClick={reset} className={styles.pushButton}>TRY AGAIN</button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className={styles.errorBox}>
                <span className={styles.errorIcon}>!</span>
                <span>Observer unavailable</span>
              </div>
              <button onClick={() => { setStatus('idle'); setShowFallback(true) }} className={styles.pushButton}>
                USE ACCESS CODE
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.footerText}>AXE TECHNOLOGY</span>
          <span className={styles.footerDivider} />
          <span className={styles.footerText}>v3.0</span>
        </div>
      </div>
    </div>
  )
}
