import { useState, useCallback } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { MessageSquare, Terminal, LayoutDashboard, Database, Code2, Brain, FileBarChart, HardDrive, LogOut, Menu, X, SquarePen, Warehouse, Download, Bookmark, GitCompare, Shield, Share2 } from 'lucide-react'
import styles from './Layout.module.css'

export default function Layout({ apiUrl: _apiUrl }: { apiUrl: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isChat = location.pathname === '/'

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const handleNewChat = useCallback(() => {
    if (isChat) {
      window.dispatchEvent(new Event('klaus-new-chat'))
    } else {
      navigate('/')
      setTimeout(() => window.dispatchEvent(new Event('klaus-new-chat')), 100)
    }
  }, [isChat, navigate])

  return (
    <div className={styles.container}>
      {/* Mobile header */}
      <header className={styles.mobileHeader}>
        <button className={styles.menuBtn} onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className={styles.mobileTitle} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className={styles.logoK}>K</span>
          <span className={styles.logoText}>KLAUS</span>
        </div>
        <button className={styles.newChatBtn} onClick={handleNewChat} aria-label="New Chat">
          <SquarePen size={18} />
        </button>
      </header>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className={styles.overlay} onClick={closeSidebar} />}

      <nav className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logoRow}>
          <div className={styles.logo} onClick={() => { closeSidebar(); navigate('/') }} style={{ cursor: 'pointer' }}>
            <span className={styles.logoK}>K</span>
            <span className={styles.logoText}>KLAUS</span>
          </div>
          <button className={styles.newChatSidebar} onClick={() => { closeSidebar(); handleNewChat() }} title="New Chat">
            <SquarePen size={16} />
          </button>
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
          <NavLink to="/datasources" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <Warehouse size={18} />
            <span>Data Sources</span>
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
          <NavLink to="/compare" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <GitCompare size={18} />
            <span>Compare</span>
          </NavLink>
          <NavLink to="/graph" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <Share2 size={18} />
            <span>Graph</span>
          </NavLink>

          <div className={styles.sectionLabel}>Tools</div>
          <NavLink to="/exports" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <Download size={18} />
            <span>Exports</span>
          </NavLink>
          <NavLink to="/saved" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <Bookmark size={18} />
            <span>Saved Queries</span>
          </NavLink>
          <NavLink to="/audit" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={closeSidebar}>
            <Shield size={18} />
            <span>Audit Log</span>
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
