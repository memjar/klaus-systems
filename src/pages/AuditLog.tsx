import { useState, useEffect } from 'react'
import { Shield, Search, Filter, Loader2, Clock, User, Activity } from 'lucide-react'
import styles from './AuditLog.module.css'

interface LogEntry {
  id: string
  timestamp: string
  user: string
  action: string
  details: string
  category: string
}

interface AuditStats {
  total_queries: number
  total_exports: number
  active_users: number
  last_24h: number
}

const CATEGORIES = ['All', 'Query', 'Export', 'Upload', 'Login'] as const
const DATE_RANGES = ['Today', '7 days', '30 days', 'All'] as const

export default function AuditLog({ apiUrl }: { apiUrl: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [dateRange, setDateRange] = useState<string>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const headers = { 'ngrok-skip-browser-warning': 'true' }

  const fetchData = async () => {
    setLoading(true)
    setError(false)
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}/klaus/imi/audit/logs`, { headers }),
        fetch(`${apiUrl}/klaus/imi/audit/stats`, { headers }),
      ])
      if (!logsRes.ok || !statsRes.ok) throw new Error('Failed')
      const logsData = await logsRes.json()
      const statsData = await statsRes.json()
      setLogs(logsData.logs || [])
      setStats(statsData)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = logs.filter(log => {
    if (category !== 'All' && log.category.toLowerCase() !== category.toLowerCase()) return false
    if (searchText) {
      const q = searchText.toLowerCase()
      if (!log.user.toLowerCase().includes(q) && !log.action.toLowerCase().includes(q) && !log.details.toLowerCase().includes(q)) return false
    }
    if (dateRange !== 'All') {
      const logDate = new Date(log.timestamp)
      const now = new Date()
      const diffMs = now.getTime() - logDate.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      if (dateRange === 'Today' && diffDays > 1) return false
      if (dateRange === '7 days' && diffDays > 7) return false
      if (dateRange === '30 days' && diffDays > 30) return false
    }
    return true
  })

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString()
    } catch {
      return ts
    }
  }

  const truncate = (s: string, len = 80) => s.length > len ? s.slice(0, len) + '...' : s

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1><Shield size={20} /> Audit Log</h1>
          <p>Compliance event tracking and activity monitoring</p>
        </div>
        <div className={styles.placeholder}>
          <Shield size={48} />
          <p>Audit logging will be available once configured by your admin</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1><Shield size={20} /> Audit Log</h1>
        <p>Compliance event tracking and activity monitoring</p>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>
          <Loader2 size={24} className={styles.spin} />
        </div>
      ) : (
        <>
          {stats && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Queries</div>
                <div className={styles.statValue}>{stats.total_queries.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Exports</div>
                <div className={styles.statValue}>{stats.total_exports.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Active Users</div>
                <div className={styles.statValue}>{stats.active_users.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Last 24h</div>
                <div className={styles.statValue}>{stats.last_24h.toLocaleString()}</div>
              </div>
            </div>
          )}

          <div className={styles.filterBar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search logs..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
            <div className={styles.filterGroup}>
              <Filter size={14} />
              <select className={styles.select} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <Clock size={14} />
              <select className={styles.select} value={dateRange} onChange={e => setDateRange(e.target.value)}>
                {DATE_RANGES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className={styles.emptyState}>No log entries match your filters</div>
          ) : (
            <div className={styles.tableWrap}>
              <div className={styles.tableHeader}>
                <span>Timestamp</span>
                <span>User</span>
                <span>Action</span>
                <span>Category</span>
                <span>Details</span>
              </div>
              {filtered.map(log => (
                <div key={log.id}>
                  <div
                    className={`${styles.tableRow} ${expandedId === log.id ? styles.rowExpanded : ''}`}
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <span className={styles.cellTimestamp}><Clock size={12} /> {formatTimestamp(log.timestamp)}</span>
                    <span className={styles.cellUser}><User size={12} /> {log.user}</span>
                    <span className={styles.cellAction}><Activity size={12} /> {log.action}</span>
                    <span className={styles.cellCategory}>
                      <span className={styles.tag}>{log.category}</span>
                    </span>
                    <span className={styles.cellDetails}>{truncate(log.details)}</span>
                  </div>
                  {expandedId === log.id && (
                    <div className={styles.expandedRow}>
                      <div className={styles.expandedLabel}>Full Details</div>
                      <div className={styles.expandedContent}>{log.details}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
