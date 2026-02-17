import { Outlet, NavLink } from 'react-router-dom'
import { MessageSquare, BarChart3, Database, LogOut } from 'lucide-react'
import styles from './Layout.module.css'

export default function Layout({ apiUrl: _apiUrl }: { apiUrl: string }) {
  return (
    <div className={styles.container}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoK}>K</span>
          <span className={styles.logoText}>KLAUS</span>
        </div>
        <div className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <MessageSquare size={18} />
            <span>Chat</span>
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <BarChart3 size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/explorer" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <Database size={18} />
            <span>Explorer</span>
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
