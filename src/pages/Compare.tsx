import { useState, useEffect, useRef } from 'react'
import { GitCompare, Plus, X, Loader2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import styles from './Compare.module.css'

interface Survey {
  id: string
  name: string
  total_n: number
}

export default function Compare({ apiUrl }: { apiUrl: string }) {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selected, setSelected] = useState<Survey[]>([])
  const [search, setSearch] = useState('')
  const [metric, setMetric] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSurveys, setLoadingSurveys] = useState(true)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

  useEffect(() => {
    fetch(`${apiUrl}/klaus/imi/surveys`, { headers })
      .then(res => res.json())
      .then(data => setSurveys(data.surveys || []))
      .catch(() => setError('Failed to load surveys'))
      .finally(() => setLoadingSurveys(false))
  }, [apiUrl])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const addSurvey = (survey: Survey) => {
    if (selected.length >= 4) return
    if (selected.find(s => s.id === survey.id)) return
    setSelected([...selected, survey])
    setSearch('')
    setDropdownOpen(false)
  }

  const removeSurvey = (id: string) => {
    setSelected(selected.filter(s => s.id !== id))
  }

  const filtered = surveys.filter(s =>
    !selected.find(sel => sel.id === s.id) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCompare = async () => {
    if (selected.length < 2 || !metric.trim()) return
    setLoading(true)
    setError('')
    setResult('')

    const studyNames = selected.map(s => s.name).join(', ')
    const message = `Compare the following studies on ${metric.trim()}: ${studyNames}. Show a detailed comparison table with key differences and trends.`

    try {
      const res = await fetch(`${apiUrl}/klaus/imi/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, history: [] }),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const parsed = JSON.parse(line)
            if (parsed.content) {
              setResult(prev => prev + parsed.content)
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer)
          if (parsed.content) {
            setResult(prev => prev + parsed.content)
          }
        } catch {
          // skip
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelected([])
    setMetric('')
    setResult('')
    setError('')
    setSearch('')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1><GitCompare size={20} /> Cross-Study Comparison</h1>
        <p>Select 2–4 datasets and compare metrics across studies</p>
      </div>

      {/* Survey Selector */}
      <div className={styles.section}>
        <label className={styles.label}>Datasets ({selected.length}/4)</label>

        <div className={styles.pills}>
          {selected.map(s => (
            <span key={s.id} className={styles.pill}>
              {s.name}
              <button className={styles.pillX} onClick={() => removeSurvey(s.id)}><X size={12} /></button>
            </span>
          ))}
        </div>

        {selected.length < 4 && (
          <div className={styles.dropdown} ref={dropdownRef}>
            <div className={styles.searchRow}>
              <Plus size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder={loadingSurveys ? 'Loading surveys...' : 'Search and add a dataset...'}
                value={search}
                onChange={e => { setSearch(e.target.value); setDropdownOpen(true) }}
                onFocus={() => setDropdownOpen(true)}
                disabled={loadingSurveys}
              />
            </div>
            {dropdownOpen && filtered.length > 0 && (
              <div className={styles.dropdownList}>
                {filtered.map(s => (
                  <button key={s.id} className={styles.dropdownItem} onClick={() => addSurvey(s)}>
                    <span>{s.name}</span>
                    <span className={styles.sampleSize}>n={s.total_n?.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metric Input */}
      <div className={styles.section}>
        <label className={styles.label}>Comparison Metric / Query</label>
        <input
          className={styles.input}
          placeholder="e.g. NPS scores, brand awareness, customer satisfaction..."
          value={metric}
          onChange={e => setMetric(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCompare() }}
        />
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.btn}
          onClick={handleCompare}
          disabled={loading || selected.length < 2 || !metric.trim()}
        >
          {loading ? <Loader2 size={16} className={styles.spin} /> : <GitCompare size={16} />}
          {loading ? 'Comparing...' : 'Compare'}
        </button>
        <button className={styles.btnSecondary} onClick={handleReset}>
          <Minus size={14} /> Clear
        </button>
      </div>

      {/* Trend legend */}
      {result && (
        <div className={styles.legend}>
          <span className={styles.legendItem}><ArrowUpRight size={13} className={styles.trendUp} /> Increase</span>
          <span className={styles.legendItem}><ArrowDownRight size={13} className={styles.trendDown} /> Decrease</span>
          <span className={styles.legendItem}><Minus size={13} /> No change</span>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.resultSection}>
          <div className={styles.resultText}>{result}</div>
        </div>
      )}
    </div>
  )
}
