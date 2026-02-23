import { useState, useCallback } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { MessageSquare, Terminal, LogOut, Menu, X } from 'lucide-react'
import styles from './Layout.module.css'

export default function Layout({ apiUrl: _apiUrl }: { apiUrl: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className={styles.container}>
      {/* Mobile header */}
      <header className={styles.mobileHeader}>
        <button className={styles.menuBtn} onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className={styles.mobileTitle}>
          <span className={styles.logoK}>K</span>
          <span className={styles.logoText}>KLAUS</span>
        </div>
        <div className={styles.mobileHeaderSpacer} />
      </header>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className={styles.overlay} onClick={closeSidebar} />}

      <nav className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <span className={styles.logoK}>K</span>
          <span className={styles.logoText}>KLAUS</span>
        </div>
        <div className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <MessageSquare size={18} />
            <span>Chat</span>
          </NavLink>
          <NavLink to="/kode" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <Terminal size={18} />
            <span>Kode</span>
          </NavLink>
        </div>
        <div className={styles.footer}>
          <div className={styles.status}>
            <span className={styles.dot} />
            <span className={styles.statusText}>Qwen 32B</span>
          </div>
          <a href="/login" className={styles.link}>
            <LogOut size={18} />
            <span>Logout</span>
          </a>
        </div>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
