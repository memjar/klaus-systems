import { useState, useCallback } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { MessageSquare, Terminal, LayoutDashboard, Database, Code2, Brain, FileBarChart, HardDrive, LogOut, Menu, X, SquarePen } from 'lucide-react'
import styles from './Layout.module.css'

export default function Layout({ apiUrl: _apiUrl }: { apiUrl: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const isChat = location.pathname === '/'

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
        {isChat ? (
          <button className={styles.newChatBtn} onClick={() => window.dispatchEvent(new Event('klaus-new-chat'))} aria-label="New Chat">
            <SquarePen size={18} />
          </button>
        ) : (
          <div className={styles.mobileHeaderSpacer} />
        )}
      </header>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className={styles.overlay} onClick={closeSidebar} />}

      <nav className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <span className={styles.logoK}>K</span>
          <span className={styles.logoText}>KLAUS</span>
        </div>
        <div className={styles.nav}>
          <div className={styles.sectionLabel}>Core</div>
          <NavLink to="/" end className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <MessageSquare size={18} />
            <span>Chat</span>
          </NavLink>
          <NavLink to="/kode" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <Terminal size={18} />
            <span>Kode</span>
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <div className={styles.sectionLabel}>Research</div>
          <NavLink to="/explorer" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <Database size={18} />
            <span>Explorer</span>
          </NavLink>
          <NavLink to="/sql" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <Code2 size={18} />
            <span>SQL Lab</span>
          </NavLink>
          <NavLink to="/duckdb" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <HardDrive size={18} />
            <span>DuckDB</span>
          </NavLink>

          <div className={styles.sectionLabel}>Intelligence</div>
          <NavLink to="/insights" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <Brain size={18} />
            <span>Insights</span>
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <FileBarChart size={18} />
            <span>Reports</span>
          </NavLink>
        </div>
        <div className={styles.footer}>
          <div className={styles.status}>
            <span className={styles.dot} />
            <span className={styles.statusText}>{localStorage.getItem('klaus_user') ? `${localStorage.getItem('klaus_user')?.charAt(0).toUpperCase()}${localStorage.getItem('klaus_user')?.slice(1)}` : 'Klaus AI'}</span>
          </div>
          <a href="#" className={styles.link} onClick={(e) => { e.preventDefault(); localStorage.removeItem('klaus_auth'); localStorage.removeItem('klaus_user'); localStorage.removeItem('observer_device_id'); localStorage.removeItem('observer_auth_expiry'); window.location.reload() }}>
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
