import { useState, useRef, useEffect } from 'react'
import { Play, Upload, Loader2, Download, Table2, Trash2, MessageSquare, FileText } from 'lucide-react'
import * as duckdb from '@duckdb/duckdb-wasm'
import styles from './DuckDB.module.css'

interface TableInfo {
  name: string
  rows: number
  columns: string[]
}

interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  time: number
  error?: string
}

export default function DuckDB({ apiUrl }: { apiUrl: string }) {
  const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [sql, setSql] = useState("SELECT 'Hello DuckDB' AS greeting, 42 AS answer;")
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [dbLoading, setDbLoading] = useState(true)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const connRef = useRef<duckdb.AsyncDuckDBConnection | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load DuckDB WASM from npm package
  useEffect(() => {
    let cancelled = false
    async function initDB() {
      try {
        const BUNDLES = {
          mvp: {
            mainModule: '/duckdb-mvp.wasm',
            mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js', import.meta.url).href,
          },
          eh: {
            mainModule: '/duckdb-eh.wasm',
            mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).href,
          },
        }
        const bundle = await duckdb.selectBundle(BUNDLES)
        const worker = new Worker(bundle.mainWorker!)
        const logger = new duckdb.ConsoleLogger()
        const instance = new duckdb.AsyncDuckDB(logger, worker)
        await instance.instantiate(bundle.mainModule)
        const conn = await instance.connect()
        if (!cancelled) {
          setDb(instance)
          connRef.current = conn
          setDbLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(`Failed to load DuckDB: ${e instanceof Error ? e.message : String(e)}`)
          setDbLoading(false)
        }
      }
    }
    initDB()
    return () => { cancelled = true }
  }, [])

  const runQuery = async (query?: string) => {
    const q = (query || sql).trim()
    if (!q || !connRef.current) return
    setLoading(true)
    setError('')
    setResult(null)
    setAnalysis('')
    const start = performance.now()
    try {
      const arrowResult = await connRef.current.query(q)
      const elapsed = performance.now() - start
      const columns = arrowResult.schema.fields.map((f: { name: string }) => f.name)
      const rows: Record<string, unknown>[] = []
      for (let i = 0; i < arrowResult.numRows; i++) {
        const row: Record<string, unknown> = {}
        for (const col of columns) {
          const val = arrowResult.getChild(col)?.get(i)
          row[col] = val !== null && val !== undefined ? (typeof val === 'bigint' ? Number(val) : val) : null
        }
        rows.push(row)
      }
      setResult({ columns, rows, time: elapsed })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setResult({ columns: [], rows: [], time: performance.now() - start, error: String(e) })
    } finally {
      setLoading(false)
      refreshTables()
    }
  }

  const refreshTables = async () => {
    if (!connRef.current) return
    try {
      const res = await connRef.current.query("SELECT table_name FROM information_schema.tables WHERE table_schema='main'")
      const tableNames: string[] = []
      for (let i = 0; i < res.numRows; i++) {
        tableNames.push(String(res.getChild('table_name')?.get(i)))
      }
      const infos: TableInfo[] = []
      for (const name of tableNames) {
        try {
          const countRes = await connRef.current.query(`SELECT count(*) as c FROM "${name}"`)
          const count = Number(countRes.getChild('c')?.get(0) || 0)
          const colRes = await connRef.current.query(`SELECT column_name FROM information_schema.columns WHERE table_name='${name}'`)
          const cols: string[] = []
          for (let j = 0; j < colRes.numRows; j++) cols.push(String(colRes.getChild('column_name')?.get(j)))
          infos.push({ name, rows: count, columns: cols })
        } catch { infos.push({ name, rows: 0, columns: [] }) }
      }
      setTables(infos)
    } catch { /* ignore */ }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !db) return
    setLoading(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const tableName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
      const buffer = await file.arrayBuffer()
      await db.registerFileBuffer(file.name, new Uint8Array(buffer))

      if (ext === 'csv') {
        await runQuery(`CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${file.name}')`)
      } else if (ext === 'json' || ext === 'jsonl') {
        await runQuery(`CREATE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${file.name}')`)
      } else if (ext === 'parquet') {
        await runQuery(`CREATE TABLE "${tableName}" AS SELECT * FROM read_parquet('${file.name}')`)
      } else {
        setError(`Unsupported format: .${ext}. Use CSV, JSON, or Parquet.`)
      }
      setSql(`SELECT * FROM "${tableName}" LIMIT 100;`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const dropTable = async (name: string) => {
    await runQuery(`DROP TABLE IF EXISTS "${name}"`)
    setTables(prev => prev.filter(t => t.name !== name))
  }

  const exportCSV = () => {
    if (!result || result.rows.length === 0) return
    const header = result.columns.join(',')
    const rows = result.rows.map(r => result.columns.map(c => {
      const v = String(r[c] ?? '')
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
    }).join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'duckdb-results.csv'
    a.click()
  }

  // Send results to Klaus for analysis
  const askKlaus = async () => {
    if (!result || result.rows.length === 0) return
    setAnalyzing(true)
    setAnalysis('')
    try {
      // Build a summary of the data for Klaus
      const sampleRows = result.rows.slice(0, 20)
      const csvSample = [
        result.columns.join(','),
        ...sampleRows.map(r => result.columns.map(c => String(r[c] ?? '')).join(','))
      ].join('\n')

      const prompt = `Analyze this query result data. The SQL query was: ${sql}\n\nColumns: ${result.columns.join(', ')}\nTotal rows: ${result.rows.length}\n\nSample data (first ${sampleRows.length} rows):\n${csvSample}\n\nProvide:\n1. A summary of what this data shows\n2. Key patterns or insights\n3. Any anomalies or notable values\n4. Suggested follow-up queries for deeper analysis`

      const resp = await fetch(`${apiUrl}/klaus/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, stream: false })
      })

      if (!resp.ok) throw new Error(`Klaus returned ${resp.status}`)

      const data = await resp.json()
      setAnalysis(data.response || data.message || JSON.stringify(data))
    } catch (err) {
      setAnalysis(`Failed to reach Klaus: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // Generate PDF report from results
  const generateReport = async () => {
    if (!result || result.rows.length === 0) return
    setGeneratingPdf(true)
    try {
      // Build markdown content for the report
      const tableRows = result.rows.slice(0, 100)
      const tableHeader = '| ' + result.columns.join(' | ') + ' |'
      const tableSep = '| ' + result.columns.map(() => '---').join(' | ') + ' |'
      const tableBody = tableRows.map(r =>
        '| ' + result.columns.map(c => String(r[c] ?? '')).join(' | ') + ' |'
      ).join('\n')
      const tableMarkdown = [tableHeader, tableSep, tableBody].join('\n')

      const content = [
        `## Query`,
        '```sql',
        sql,
        '```',
        `## Results Summary`,
        `- **Rows returned:** ${result.rows.length}`,
        `- **Columns:** ${result.columns.join(', ')}`,
        `- **Query time:** ${result.time.toFixed(1)}ms`,
        analysis ? `## Klaus Analysis\n${analysis}` : '',
        `## Data`,
        tableMarkdown,
      ].filter(Boolean).join('\n\n')

      const resp = await fetch(`${apiUrl}/klaus/imi/generate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          title: 'DuckDB Query Report',
          format: 'pdf'
        })
      })

      if (!resp.ok) throw new Error(`Report generation failed: ${resp.status}`)

      const data = await resp.json()
      // Download the PDF
      const a = document.createElement('a')
      a.href = `${apiUrl}/klaus/imi/document/${data.doc_id}?format=pdf`
      a.download = 'klaus-duckdb-report.pdf'
      a.click()
    } catch (err) {
      setError(`Report generation failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      runQuery()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Table2 size={16} />
          <span>Tables</span>
        </div>
        {dbLoading ? (
          <div className={styles.sidebarEmpty}><Loader2 size={16} className={styles.spin} /> Loading DuckDB...</div>
        ) : tables.length === 0 ? (
          <div className={styles.sidebarEmpty}>No tables yet. Upload a file or CREATE TABLE.</div>
        ) : tables.map(t => (
          <div key={t.name} className={styles.tableCard} onClick={() => { setSql(`SELECT * FROM "${t.name}" LIMIT 100;`); runQuery(`SELECT * FROM "${t.name}" LIMIT 100;`) }}>
            <div className={styles.tableName}>{t.name}</div>
            <div className={styles.tableMeta}>{t.rows.toLocaleString()} rows · {t.columns.length} cols</div>
            <button className={styles.dropBtn} onClick={(e) => { e.stopPropagation(); dropTable(t.name) }} title="Drop table"><Trash2 size={12} /></button>
          </div>
        ))}
        <input ref={fileRef} type="file" accept=".csv,.json,.jsonl,.parquet,.xlsx" onChange={handleFileUpload} style={{ display: 'none' }} />
        <button className={styles.uploadBtn} onClick={() => fileRef.current?.click()} disabled={dbLoading}>
          <Upload size={14} /> Import File
        </button>
      </div>

      <div className={styles.main}>
        <div className={styles.header}>
          <h1>DuckDB</h1>
          <p>In-browser analytical SQL — import CSV, JSON, or Parquet files. Ask Klaus to analyze results or generate PDF reports.</p>
        </div>

        <div className={styles.editorSection}>
          <textarea
            ref={textareaRef}
            className={styles.editor}
            value={sql}
            onChange={e => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter SQL query..."
            rows={5}
            spellCheck={false}
          />
          <div className={styles.editorActions}>
            <button className={styles.runBtn} onClick={() => runQuery()} disabled={loading || dbLoading || !sql.trim()}>
              {loading ? <Loader2 size={14} className={styles.spin} /> : <Play size={14} />}
              Run {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
            </button>
            {result && result.rows.length > 0 && (
              <>
                <button className={styles.exportBtn} onClick={exportCSV}>
                  <Download size={14} /> Export CSV
                </button>
                <button className={styles.klausBtn} onClick={askKlaus} disabled={analyzing}>
                  {analyzing ? <Loader2 size={14} className={styles.spin} /> : <MessageSquare size={14} />}
                  Ask Klaus
                </button>
                <button className={styles.reportBtn} onClick={generateReport} disabled={generatingPdf}>
                  {generatingPdf ? <Loader2 size={14} className={styles.spin} /> : <FileText size={14} />}
                  PDF Report
                </button>
              </>
            )}
            <div className={styles.editorSpacer} />
            <div className={styles.suggestions}>
              {['SELECT * FROM ', 'DESCRIBE ', 'SHOW TABLES', "CREATE TABLE demo AS SELECT * FROM read_csv_auto('file.csv')"].map(s => (
                <button key={s} className={styles.suggestionBtn} onClick={() => setSql(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {analysis && (
          <div className={styles.analysisSection}>
            <div className={styles.analysisHeader}>
              <MessageSquare size={14} /> Klaus Analysis
            </div>
            <div className={styles.analysisBody}>{analysis}</div>
          </div>
        )}

        {result && !result.error && (
          <div className={styles.resultsSection}>
            <div className={styles.resultsHeader}>
              <span>{result.rows.length} row{result.rows.length !== 1 ? 's' : ''}</span>
              <span className={styles.resultTime}>{result.time.toFixed(1)}ms</span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 500).map((row, i) => (
                    <tr key={i}>{result.columns.map(c => <td key={c}>{String(row[c] ?? 'NULL')}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.rows.length > 500 && <div className={styles.truncated}>Showing 500 of {result.rows.length} rows</div>}
          </div>
        )}
      </div>
    </div>
  )
}
