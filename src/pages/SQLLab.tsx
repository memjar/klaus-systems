import { useState } from 'react'
import { Play, Sparkles, Loader2 } from 'lucide-react'
import styles from './SQLLab.module.css'

export default function SQLLab({ apiUrl }: { apiUrl: string }) {
  const [question, setQuestion] = useState('')
  const [sql, setSql] = useState('')
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null)
  const [generating, setGenerating] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState('')

  const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

  const generateSQL = async () => {
    if (!question.trim()) return
    setGenerating(true)
    setError('')
    setSql('')
    setResults(null)
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/sql/generate`, {
        method: 'POST', headers,
        body: JSON.stringify({ question: question.trim() }),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const data = await res.json()
      setSql(data.sql || data.query || JSON.stringify(data, null, 2))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate SQL')
    } finally {
      setGenerating(false)
    }
  }

  const executeSQL = async () => {
    if (!sql.trim()) return
    setExecuting(true)
    setError('')
    setResults(null)
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/sql/execute`, {
        method: 'POST', headers,
        body: JSON.stringify({ sql: sql.trim() }),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const data = await res.json()
      setResults(data.results || data.rows || data.data || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to execute SQL')
    } finally {
      setExecuting(false)
    }
  }

  const columns = results && results.length > 0 ? Object.keys(results[0]) : []

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>SQL Lab</h1>
        <p>Natural language to SQL — query 55+ years of IMI data</p>
      </div>

      <div className={styles.inputSection}>
        <textarea
          className={styles.textarea}
          placeholder="Ask a question in plain English, e.g. 'Show top 10 brands by awareness in Germany 2023'"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          rows={3}
        />
        <button className={styles.btn} onClick={generateSQL} disabled={generating || !question.trim()}>
          {generating ? <Loader2 size={16} className={styles.spin} /> : <Sparkles size={16} />}
          Generate SQL
        </button>
      </div>

      {sql && (
        <div className={styles.sqlSection}>
          <div className={styles.sqlHeader}>
            <span>Generated SQL</span>
            <button className={styles.btn} onClick={executeSQL} disabled={executing}>
              {executing ? <Loader2 size={16} className={styles.spin} /> : <Play size={16} />}
              Execute
            </button>
          </div>
          <pre className={styles.sqlCode}>{sql}</pre>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {results && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>{results.length} row{results.length !== 1 ? 's' : ''} returned</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>{columns.map(c => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i}>{columns.map(c => <td key={c}>{String(row[c] ?? '')}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
