import { useState, useEffect } from 'react'
import { Download, FileText, Presentation, Table, Loader2 } from 'lucide-react'
import styles from './Exports.module.css'

type Format = 'pdf' | 'pptx' | 'csv' | 'markdown'

interface ExportRecord {
  id: string
  template: string
  format: Format
  topic: string
  timestamp: string
  filename: string
}

const FORMAT_CARDS: { format: Format; label: string; icon: typeof FileText; desc: string }[] = [
  { format: 'pdf', label: 'PDF', icon: FileText, desc: 'Formatted report document' },
  { format: 'pptx', label: 'PPTX', icon: Presentation, desc: 'Presentation deck' },
  { format: 'csv', label: 'CSV', icon: Table, desc: 'Raw data export' },
  { format: 'markdown', label: 'Markdown', icon: Download, desc: 'Plain text report' },
]

const TEMPLATES = [
  'Brand Health Summary',
  'Market Landscape',
  'Competitive Analysis',
  'Trend Report',
  'Executive Brief',
]

const STORAGE_KEY = 'klaus-export-history'

function loadHistory(): ExportRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function saveHistory(records: ExportRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 20)))
}

export default function Exports({ apiUrl }: { apiUrl: string }) {
  const [selectedFormat, setSelectedFormat] = useState<Format>('pdf')
  const [template, setTemplate] = useState(TEMPLATES[0])
  const [templates, setTemplates] = useState<string[]>(TEMPLATES)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [downloadName, setDownloadName] = useState('')
  const [history, setHistory] = useState<ExportRecord[]>(loadHistory)

  const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

  useEffect(() => {
    fetch(`${apiUrl}/klaus/imi/reports/templates`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.templates && Array.isArray(data.templates)) {
          setTemplates(data.templates)
          setTemplate(data.templates[0])
        }
      })
      .catch(() => {})
  }, [apiUrl])

  const generate = async () => {
    setLoading(true)
    setError('')
    setDownloadUrl('')
    setDownloadName('')

    try {
      const url = selectedFormat === 'pptx'
        ? `${apiUrl}/klaus/imi/report/pptx`
        : `${apiUrl}/klaus/imi/report/generate`

      const body = selectedFormat === 'pptx'
        ? { template, ...(topic ? { topic } : {}) }
        : { template, format: selectedFormat, ...(topic ? { topic } : {}) }

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        const data = await res.json()
        const content = data.result || data.report || data.content || data.download_url || JSON.stringify(data, null, 2)

        if (data.download_url) {
          setDownloadUrl(data.download_url)
          setDownloadName(data.filename || `report.${selectedFormat}`)
        } else if (selectedFormat === 'markdown') {
          const blob = new Blob([content], { type: 'text/markdown' })
          setDownloadUrl(URL.createObjectURL(blob))
          setDownloadName(`${template.toLowerCase().replace(/\s+/g, '-')}.md`)
        } else {
          const blob = new Blob([content], { type: 'text/plain' })
          setDownloadUrl(URL.createObjectURL(blob))
          setDownloadName(`${template.toLowerCase().replace(/\s+/g, '-')}.${selectedFormat}`)
        }
      } else {
        const blob = await res.blob()
        setDownloadUrl(URL.createObjectURL(blob))
        setDownloadName(`${template.toLowerCase().replace(/\s+/g, '-')}.${selectedFormat}`)
      }

      const record: ExportRecord = {
        id: Date.now().toString(),
        template,
        format: selectedFormat,
        topic: topic || '—',
        timestamp: new Date().toISOString(),
        filename: `${template.toLowerCase().replace(/\s+/g, '-')}.${selectedFormat}`,
      }
      const updated = [record, ...history].slice(0, 20)
      setHistory(updated)
      saveHistory(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    setHistory([])
    saveHistory([])
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Export Center</h1>
        <p>Generate and download reports in multiple formats</p>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Format</label>
        <div className={styles.formatGrid}>
          {FORMAT_CARDS.map(({ format, label, icon: Icon, desc }) => (
            <button
              key={format}
              className={`${styles.formatCard} ${selectedFormat === format ? styles.formatCardActive : ''}`}
              onClick={() => setSelectedFormat(format)}
            >
              <Icon size={20} />
              <span className={styles.formatLabel}>{label}</span>
              <span className={styles.formatDesc}>{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Template</label>
        <select className={styles.select} value={template} onChange={e => setTemplate(e.target.value)}>
          {templates.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Topic / Query (optional)</label>
        <input
          className={styles.input}
          placeholder="e.g. brand awareness in Germany, Q4 performance..."
          value={topic}
          onChange={e => setTopic(e.target.value)}
        />
      </div>

      <button className={styles.btn} onClick={generate} disabled={loading}>
        {loading ? <Loader2 size={16} className={styles.spin} /> : <Download size={16} />}
        Generate {selectedFormat.toUpperCase()}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {downloadUrl && (
        <div className={styles.downloadSection}>
          <a href={downloadUrl} download={downloadName} className={styles.downloadLink}>
            <Download size={16} />
            Download {downloadName}
          </a>
        </div>
      )}

      {history.length > 0 && (
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <label className={styles.label}>Recent Exports</label>
            <button className={styles.clearBtn} onClick={clearHistory}>Clear</button>
          </div>
          <div className={styles.historyList}>
            {history.map(rec => (
              <div key={rec.id} className={styles.historyItem}>
                <span className={styles.historyFormat}>{rec.format.toUpperCase()}</span>
                <span className={styles.historyTemplate}>{rec.template}</span>
                <span className={styles.historyTopic}>{rec.topic}</span>
                <span className={styles.historyTime}>{new Date(rec.timestamp).toLocaleDateString()} {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
