import { useState, useEffect, useRef } from 'react'
import { Bookmark, Play, Trash2, Search, Plus, Loader2, Copy } from 'lucide-react'
import styles from './SavedQueries.module.css'

const STORAGE_KEY = 'klaus_saved_queries'
const CATEGORIES = ['Analysis', 'SQL', 'Report', 'Custom'] as const
type Category = typeof CATEGORIES[number]

interface SavedQuery {
  id: string
  name: string
  query: string
  category: Category
  createdAt: string
}

function loadQueries(): SavedQuery[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveQueries(queries: SavedQuery[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queries))
}

export default function SavedQueries({ apiUrl }: { apiUrl: string }) {
  const [queries, setQueries] = useState<SavedQuery[]>(loadQueries)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formQuery, setFormQuery] = useState('')
  const [formCategory, setFormCategory] = useState<Category>('Custom')
  const [runningId, setRunningId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

  useEffect(() => {
    saveQueries(queries)
  }, [queries])

  const filtered = queries.filter(q => {
    const term = search.toLowerCase()
    return !term || q.name.toLowerCase().includes(term) || q.query.toLowerCase().includes(term) || q.category.toLowerCase().includes(term)
  })

  const addQuery = () => {
    if (!formName.trim() || !formQuery.trim()) return
    const newQuery: SavedQuery = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: formName.trim(),
      query: formQuery.trim(),
      category: formCategory,
      createdAt: new Date().toISOString(),
    }
    setQueries(prev => [newQuery, ...prev])
    setFormName('')
    setFormQuery('')
    setFormCategory('Custom')
    setShowForm(false)
  }

  const deleteQuery = (id: string) => {
    setQueries(prev => prev.filter(q => q.id !== id))
    setDeleteConfirm(null)
    setResults(prev => { const next = { ...prev }; delete next[id]; return next })
  }

  const copyQuery = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const runQuery = async (q: SavedQuery) => {
    if (runningId) {
      abortRef.current?.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller
    setRunningId(q.id)
    setResults(prev => ({ ...prev, [q.id]: '' }))

    try {
      const res = await fetch(`${apiUrl}/klaus/imi/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: q.query, history: [] }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const parsed = JSON.parse(trimmed)
            if (parsed.content) {
              accumulated += parsed.content
              setResults(prev => ({ ...prev, [q.id]: accumulated }))
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
      // handle remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim())
          if (parsed.content) {
            accumulated += parsed.content
            setResults(prev => ({ ...prev, [q.id]: accumulated }))
          }
        } catch {
          // skip
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      const msg = e instanceof Error ? e.message : 'Request failed'
      setResults(prev => ({ ...prev, [q.id]: `Error: ${msg}` }))
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1><Bookmark size={20} /> Saved Queries</h1>
        <p>Save, organize, and re-run your favorite queries</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Filter saved queries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className={styles.btn} onClick={() => setShowForm(!showForm)}>
          <Plus size={14} />
          Save New Query
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              placeholder="Query name"
              value={formName}
              onChange={e => setFormName(e.target.value)}
            />
            <select className={styles.select} value={formCategory} onChange={e => setFormCategory(e.target.value as Category)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea
            className={styles.textarea}
            placeholder="Enter your query..."
            value={formQuery}
            onChange={e => setFormQuery(e.target.value)}
            rows={3}
          />
          <div className={styles.formActions}>
            <button className={styles.btn} onClick={addQuery} disabled={!formName.trim() || !formQuery.trim()}>
              Save
            </button>
            <button className={styles.btnSecondary} onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {queries.length === 0 ? 'No saved queries yet. Click "Save New Query" to get started.' : 'No queries match your filter.'}
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Name</span>
            <span>Query</span>
            <span>Category</span>
            <span>Saved</span>
            <span>Actions</span>
          </div>
          {filtered.map(q => (
            <div key={q.id} className={styles.tableRow}>
              <span className={styles.cellName}>{q.name}</span>
              <span className={styles.cellQuery}>{q.query}</span>
              <span><span className={`${styles.tag} ${styles[`tag${q.category}`]}`}>{q.category}</span></span>
              <span className={styles.cellDate}>{new Date(q.createdAt).toLocaleDateString()}</span>
              <span className={styles.cellActions}>
                <button className={styles.iconBtn} title="Run query" onClick={() => runQuery(q)} disabled={runningId === q.id}>
                  {runningId === q.id ? <Loader2 size={14} className={styles.spin} /> : <Play size={14} />}
                </button>
                <button className={styles.iconBtn} title="Copy query" onClick={() => copyQuery(q.id, q.query)}>
                  <Copy size={14} />
                  {copied === q.id && <span className={styles.copiedToast}>Copied</span>}
                </button>
                {deleteConfirm === q.id ? (
                  <>
                    <button className={styles.iconBtnDanger} title="Confirm delete" onClick={() => deleteQuery(q.id)}>
                      <Trash2 size={14} />
                    </button>
                    <button className={styles.iconBtn} title="Cancel" onClick={() => setDeleteConfirm(null)} style={{ fontSize: 11 }}>
                      esc
                    </button>
                  </>
                ) : (
                  <button className={styles.iconBtn} title="Delete" onClick={() => setDeleteConfirm(q.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </span>
              {results[q.id] !== undefined && (
                <div className={styles.resultInline}>
                  <pre className={styles.resultPre}>{results[q.id] || 'Waiting for response...'}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
