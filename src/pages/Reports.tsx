import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import MarkdownContent from '../components/MarkdownContent'
import styles from './Reports.module.css'

const TABS = ['Reports', 'Case Studies', 'RFP Generator'] as const
type Tab = typeof TABS[number]

const REPORT_TEMPLATES = [
  'Brand Health Summary',
  'Market Landscape',
  'Competitive Analysis',
  'Trend Report',
  'Executive Brief',
]

export default function Reports({ apiUrl }: { apiUrl: string }) {
  const [tab, setTab] = useState<Tab>('Reports')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  // Reports
  const [template, setTemplate] = useState(REPORT_TEMPLATES[0])

  // Case Studies
  const [searchQuery, setSearchQuery] = useState('')

  // RFP
  const [requirements, setRequirements] = useState('')

  const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

  const run = async (url: string, body?: object, method = 'POST') => {
    setLoading(true)
    setError('')
    setResult('')
    try {
      const opts: RequestInit = { method, headers }
      if (body) opts.body = JSON.stringify(body)
      const res = await fetch(url, opts)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const data = await res.json()
      setResult(data.result || data.report || data.response || data.content || JSON.stringify(data, null, 2))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Reports</h1>
        <p>Generate reports, explore case studies, and build RFP responses</p>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => { setTab(t); setResult(''); setError('') }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Reports' && (
        <div className={styles.inputSection}>
          <label className={styles.label}>Report Template</label>
          <select className={styles.select} value={template} onChange={e => setTemplate(e.target.value)}>
            {REPORT_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className={styles.btn} onClick={() => run(`${apiUrl}/klaus/imi/report/generate`, { template })} disabled={loading}>
            {loading ? <Loader2 size={16} className={styles.spin} /> : null}
            Generate Report
          </button>
        </div>
      )}

      {tab === 'Case Studies' && (
        <div className={styles.inputSection}>
          <input
            className={styles.input}
            placeholder="Search case studies (e.g. brand awareness, Germany, automotive)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button className={styles.btn} onClick={() => run(`${apiUrl}/klaus/imi/case-studies/search?q=${encodeURIComponent(searchQuery)}`, undefined, 'GET')} disabled={loading || !searchQuery.trim()}>
            {loading ? <Loader2 size={16} className={styles.spin} /> : null}
            Search
          </button>
        </div>
      )}

      {tab === 'RFP Generator' && (
        <div className={styles.inputSection}>
          <textarea
            className={styles.textarea}
            placeholder="Paste RFP requirements or describe what the client needs..."
            value={requirements}
            onChange={e => setRequirements(e.target.value)}
            rows={5}
          />
          <button className={styles.btn} onClick={() => run(`${apiUrl}/klaus/imi/rfp/generate`, { requirements })} disabled={loading || !requirements.trim()}>
            {loading ? <Loader2 size={16} className={styles.spin} /> : null}
            Generate RFP Response
          </button>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.resultSection}>
          <MarkdownContent content={result} />
        </div>
      )}
    </div>
  )
}
