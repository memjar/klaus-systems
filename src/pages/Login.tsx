import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Login.module.css'

export default function Login() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Observer Auth integration placeholder
    if (code.trim()) {
      localStorage.setItem('klaus_auth', code.trim())
      navigate('/')
    } else {
      setError('Enter access code')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoK}>K</span>
        </div>
        <h1 className={styles.title}>KLAUS SYSTEMS</h1>
        <p className={styles.subtitle}>IMI Research Intelligence Platform</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="password"
            value={code}
            onChange={e => { setCode(e.target.value); setError('') }}
            placeholder="Access code"
            className={styles.input}
            autoFocus
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button}>
            Authenticate
          </button>
        </form>
        <p className={styles.powered}>Powered by Qwen 32B</p>
      </div>
    </div>
  )
}
