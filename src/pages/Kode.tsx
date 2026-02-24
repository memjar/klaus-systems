import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Upload, AlertTriangle, FileText, Presentation, Database, BarChart3, Table2, Terminal } from 'lucide-react'
import MarkdownContent from '../components/MarkdownContent'
import styles from './Kode.module.css'

type ViewType = 'welcome' | 'stats' | 'anomalies' | 'report' | 'deck' | 'sql' | 'table'

interface Dataset {
  id: string
  name: string
  total_n: number
}

interface StatsData {
  datasets: number
  dataset_files: string[]
  vector_documents: number
  training_pairs: number
  avg_training_quality: string
  chart_types: number
  endpoints: string[]
}

export default function Kode({ apiUrl }: { apiUrl: string }) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewType>('welcome')
  const [canvasData, setCanvasData] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mini chat state
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatResponse, setChatResponse] = useState('')
  const chatInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const headers = { 'ngrok-skip-browser-warning': 'true' }

  // Fetch datasets on mount
  useEffect(() => {
    fetchDatasets()
  }, [])

  async function fetchDatasets() {
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/surveys`, { headers })
      if (res.ok) {
        const data = await res.json()
        setDatasets(data.surveys || [])
      }
    } catch { /* offline */ }
  }

  async function apiFetch(path: string, opts?: RequestInit) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}${path}`, {
        ...opts,
        headers: { ...headers, ...(opts?.headers || {}) },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }

  // ─── Actions ───
  async function loadStats() {
    setActiveView('stats')
    const data = await apiFetch('/klaus/imi/stats')
    if (data) setCanvasData(data)
  }

  async function loadAnomalies() {
    setActiveView('anomalies')
    const path = selectedDataset ? `/klaus/imi/anomalies/${selectedDataset}` : '/klaus/imi/anomalies'
    const data = await apiFetch(path)
    if (data) setCanvasData(data)
  }

  async function generateReport() {
    setActiveView('report')
    const data = await apiFetch('/klaus/imi/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: 'brand health overview' }),
    })
    if (data) setCanvasData(data)
  }

  async function generateDeck() {
    if (!selectedDataset) {
      setError('Select a dataset first')
      return
    }
    setActiveView('deck')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/generate-deck`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ survey_id: selectedDataset }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedDataset}_IMI.pptx`
      a.click()
      URL.revokeObjectURL(url)
      setCanvasData({ downloaded: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deck generation failed')
    } finally {
      setLoading(false)
    }
  }

  function openSQL() {
    setActiveView('sql')
    setCanvasData(null)
    setError(null)
  }

  async function runSQL(query: string) {
    const data = await apiFetch('/klaus/imi/sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    if (data) setCanvasData(data)
  }

  async function selectDataset(ds: Dataset) {
    setSelectedDataset(ds.id)
    setActiveView('table')
    // Show survey detail if available
    const data = await apiFetch(`/klaus/imi/dashboard`)
    if (data) setCanvasData({ ...data, selectedName: ds.name, selectedN: ds.total_n })
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/upload-survey`, {
        method: 'POST',
        headers,
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      await fetchDatasets()
      setActiveView('stats')
      await loadStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── Mini Chat ───
  async function sendChat() {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatLoading(true)
    setChatResponse('')
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/chat`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: selectedDataset ? `[Context: dataset "${selectedDataset}"]\n${msg}` : msg,
          history: [],
          agent: 'klaus-imi',
          use_tools: true,
          prefer_speed: true,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n').filter(l => l.trim())) {
          try {
            const parsed = JSON.parse(line)
            if (parsed.type === 'token') {
              full += parsed.content || ''
              setChatResponse(full)
            } else if (parsed.message?.content) {
              const token = parsed.message.content.replace(/<\/?think>/g, '')
              if (token) { full += token; setChatResponse(full) }
            }
          } catch { /* skip */ }
        }
      }
      if (!full) setChatResponse('No response.')
    } catch {
      setChatResponse('Connection error.')
    } finally {
      setChatLoading(false)
      chatInputRef.current?.focus()
    }
  }

  // ─── Render helpers ───
  function renderCanvas() {
    if (loading) {
      return <div className={styles.loadingOverlay}><Loader2 size={20} className={styles.spinner} /> Loading...</div>
    }
    if (error) {
      return <div className={styles.errorBox}>{error}</div>
    }

    switch (activeView) {
      case 'welcome':
        return (
          <div className={styles.canvasEmpty}>
            <Terminal size={32} style={{ color: 'var(--green)' }} />
            <h3>IMI Analyst Workbench</h3>
            <p>Select a dataset from the sidebar or use the toolbar actions to run anomaly detection, generate reports, create decks, or query with SQL.</p>
          </div>
        )

      case 'stats': {
        const d = canvasData as StatsData | null
        if (!d) return null
        return (
          <>
            <h3 className={styles.sectionHeader}><BarChart3 size={16} /> System Overview</h3>
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{d.datasets}</div>
                <div className={styles.statLabel}>Datasets</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{d.vector_documents || 0}</div>
                <div className={styles.statLabel}>Vector Documents</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{d.training_pairs || 0}</div>
                <div className={styles.statLabel}>Training Pairs</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{d.chart_types || 0}</div>
                <div className={styles.statLabel}>Chart Types</div>
              </div>
            </div>
            {d.dataset_files && (
              <>
                <h3 className={styles.sectionHeader}>Datasets on Disk</h3>
                <table className={styles.dataTable}>
                  <thead><tr><th>File</th></tr></thead>
                  <tbody>
                    {d.dataset_files.map(f => <tr key={f}><td>{f}</td></tr>)}
                  </tbody>
                </table>
              </>
            )}
          </>
        )
      }

      case 'anomalies': {
        const d = canvasData as Record<string, unknown> | null
        if (!d) return null
        // Cached responses return various shapes — render what we get
        if (d.ok === false) return <div className={styles.errorBox}>{String(d.error || 'No anomaly data')}</div>
        const items = Array.isArray(d.anomalies) ? d.anomalies : Array.isArray(d.results) ? d.results : null
        if (items) {
          return (
            <>
              <h3 className={styles.sectionHeader}><AlertTriangle size={16} /> Anomalies Detected</h3>
              <div className={styles.anomalyList}>
                {items.map((item: Record<string, unknown>, i: number) => (
                  <div key={i} className={styles.anomalyItem}>
                    <span className={`${styles.severityBadge} ${
                      item.severity === 'high' ? styles.severityHigh :
                      item.severity === 'medium' ? styles.severityMedium : styles.severityLow
                    }`}>{String(item.severity || 'info')}</span>
                    <span className={styles.anomalyText}>{String(item.description || item.message || JSON.stringify(item))}</span>
                  </div>
                ))}
              </div>
            </>
          )
        }
        // Fallback: render raw JSON prettily
        return (
          <>
            <h3 className={styles.sectionHeader}><AlertTriangle size={16} /> Anomaly Results</h3>
            <div className={styles.reportContent}>
              <MarkdownContent content={'```json\n' + JSON.stringify(d, null, 2) + '\n```'} />
            </div>
          </>
        )
      }

      case 'report': {
        const d = canvasData as Record<string, unknown> | null
        if (!d) return null
        if (d.ok === false) return <div className={styles.errorBox}>{String(d.error || 'Report generation failed')}</div>
        const report = String(d.report || d.content || JSON.stringify(d, null, 2))
        return (
          <div className={styles.reportView}>
            <h3 className={styles.sectionHeader}><FileText size={16} /> Generated Report</h3>
            <div className={styles.reportActions}>
              <button className={styles.actionBtn} onClick={() => navigator.clipboard.writeText(report)}>Copy</button>
              <button className={styles.actionBtn} onClick={() => {
                const blob = new Blob([report], { type: 'text/markdown' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'imi-report.md'
                a.click()
              }}>Download .md</button>
            </div>
            <div className={styles.reportContent}>
              <MarkdownContent content={report} />
            </div>
          </div>
        )
      }

      case 'deck': {
        const d = canvasData as Record<string, unknown> | null
        if (d?.downloaded) {
          return (
            <div className={styles.deckSuccess}>
              <Presentation size={40} style={{ color: 'var(--green)' }} />
              <p>PPTX deck downloaded successfully.</p>
              <button className={styles.actionBtn} onClick={generateDeck}>Generate Again</button>
            </div>
          )
        }
        return null
      }

      case 'sql':
        return <SQLView onRun={runSQL} result={canvasData} loading={loading} />

      case 'table': {
        const d = canvasData as Record<string, unknown> | null
        if (!d) return null
        return (
          <>
            <h3 className={styles.sectionHeader}><Table2 size={16} /> {String((d as Record<string, unknown>).selectedName || 'Dataset')}</h3>
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{String((d as Record<string, unknown>).selectedN || 0)}</div>
                <div className={styles.statLabel}>Respondents</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{(d as Record<string, unknown>).datasets as number || 0}</div>
                <div className={styles.statLabel}>Total Datasets</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{(d as Record<string, unknown>).total_records as number || 0}</div>
                <div className={styles.statLabel}>Total Records</div>
              </div>
            </div>
            {Array.isArray((d as Record<string, unknown>).datasets_info) && (
              <table className={styles.dataTable}>
                <thead><tr><th>Dataset</th><th>Records</th><th>Type</th></tr></thead>
                <tbody>
                  {((d as Record<string, unknown>).datasets_info as Array<Record<string, unknown>>).map((ds, i) => (
                    <tr key={i}><td>{String(ds.name)}</td><td>{String(ds.records)}</td><td>{String(ds.type)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )
      }

      default:
        return null
    }
  }

  return (
    <div className={styles.workbench}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button className={`${styles.actionBtn} ${activeView === 'stats' ? styles.actionBtnActive : ''}`} onClick={loadStats}>
          <BarChart3 size={13} /> Stats
        </button>
        <button className={`${styles.actionBtn} ${activeView === 'anomalies' ? styles.actionBtnActive : ''}`} onClick={loadAnomalies}>
          <AlertTriangle size={13} /> Anomalies
        </button>
        <button className={`${styles.actionBtn} ${activeView === 'report' ? styles.actionBtnActive : ''}`} onClick={generateReport}>
          <FileText size={13} /> Report
        </button>
        <button className={`${styles.actionBtn} ${activeView === 'deck' ? styles.actionBtnActive : ''}`} onClick={generateDeck} disabled={!selectedDataset}>
          <Presentation size={13} /> Deck
        </button>
        <button className={`${styles.actionBtn} ${activeView === 'sql' ? styles.actionBtnActive : ''}`} onClick={openSQL}>
          <Database size={13} /> SQL
        </button>
        <div className={styles.toolbarSpacer} />
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
        <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()} disabled={loading}>
          <Upload size={13} /> Upload
        </button>
      </div>

      {/* Body: sidebar + canvas */}
      <div className={styles.body}>
        <div className={styles.sidebar}>
          <span className={styles.sidebarLabel}>Datasets</span>
          {datasets.length === 0 ? (
            <div className={styles.noDatasets}>No datasets loaded. Upload a file to get started.</div>
          ) : (
            datasets.map(ds => (
              <div
                key={ds.id}
                className={`${styles.datasetCard} ${selectedDataset === ds.id ? styles.datasetCardActive : ''}`}
                onClick={() => selectDataset(ds)}
              >
                <div className={styles.datasetName}>{ds.name}</div>
                <div className={styles.datasetMeta}>{ds.total_n.toLocaleString()} respondents</div>
              </div>
            ))
          )}
          <div className={styles.sidebarDivider} />
          <span className={styles.sidebarLabel}>Quick Actions</span>
          <div className={styles.suggestions}>
            {[
              { label: 'Brand Health Summary', prompt: 'Give me a brand health summary across all loaded datasets' },
              { label: 'Top Anomalies', prompt: 'What are the top anomalies and outliers in the data?' },
              { label: 'Key Demographics', prompt: 'Break down the key demographic segments and their differences' },
              { label: 'Competitive Analysis', prompt: 'Compare brand performance against competitors in the data' },
              { label: 'Trend Insights', prompt: 'What trends or patterns are emerging from the survey data?' },
              { label: 'NPS / Satisfaction', prompt: 'Analyze NPS scores and satisfaction metrics across segments' },
              { label: 'Generate Report', prompt: 'Generate a comprehensive research report from the loaded data' },
              { label: 'Cross-Tab Analysis', prompt: 'Run cross-tabulation analysis on key variables' },
            ].map(s => (
              <button
                key={s.label}
                className={styles.suggestionBtn}
                onClick={() => { setChatInput(s.prompt); chatInputRef.current?.focus() }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.canvas}>
          {renderCanvas()}
        </div>
      </div>

      {/* Mini chat bar */}
      <div className={styles.chatBar}>
        {chatResponse && (
          <div className={styles.chatResponse}>
            <MarkdownContent content={chatResponse} />
          </div>
        )}
        <form className={styles.chatInputRow} onSubmit={e => { e.preventDefault(); sendChat() }}>
          <input
            ref={chatInputRef}
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Ask Klaus anything..."
            className={styles.chatInput}
            disabled={chatLoading}
          />
          <button type="submit" className={styles.chatSendBtn} disabled={chatLoading || !chatInput.trim()}>
            {chatLoading ? <Loader2 size={14} className={styles.spinner} /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── SQL Sub-view ───
function SQLView({ onRun, result, loading }: { onRun: (q: string) => void; result: unknown; loading: boolean }) {
  const [query, setQuery] = useState('')
  const d = result as Record<string, unknown> | null

  return (
    <div className={styles.sqlView}>
      <h3 className={styles.sectionHeader}><Database size={16} /> SQL Query</h3>
      <textarea
        className={styles.sqlInput}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="SELECT * FROM brand_health_tracker LIMIT 10"
        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); onRun(query) } }}
      />
      <button className={styles.sqlRunBtn} onClick={() => onRun(query)} disabled={loading || !query.trim()}>
        Run Query
      </button>
      {d && (
        <div className={styles.reportContent}>
          {d.ok === false ? (
            <div className={styles.errorBox}>{String(d.error)}</div>
          ) : (
            <MarkdownContent content={'```json\n' + JSON.stringify(d, null, 2) + '\n```'} />
          )}
        </div>
      )}
    </div>
  )
}
