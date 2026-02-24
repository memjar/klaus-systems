import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import MarkdownContent from '../components/MarkdownContent'
import styles from './Insights.module.css'

const TABS = ['Meta-Analysis', 'Anomalies', 'Patterns', 'ML Predictions', 'Knowledge Graph', 'Search'] as const
type Tab = typeof TABS[number]

export default function Insights({ apiUrl }: { apiUrl: string }) {
  const [tab, setTab] = useState<Tab>('Meta-Analysis')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  // Form state
  const [input, setInput] = useState('')

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
      setResult(data.result || data.analysis || data.response || data.content || JSON.stringify(data, null, 2))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (!input.trim() && tab !== 'Anomalies') return
    switch (tab) {
      case 'Meta-Analysis':
        return run(`${apiUrl}/klaus/imi/meta-analysis`, { question: input, datasets: input })
      case 'Anomalies':
        return run(`${apiUrl}/klaus/imi/anomalies${input.trim() ? '/' + encodeURIComponent(input.trim()) : ''}`, undefined, 'GET')
      case 'Patterns':
        return run(`${apiUrl}/klaus/imi/patterns/all`, undefined, 'GET')
      case 'ML Predictions':
        return run(`${apiUrl}/klaus/imi/ml/predict`, { features: input })
      case 'Knowledge Graph':
        return run(`${apiUrl}/klaus/imi/graph/search?q=${encodeURIComponent(input)}`, undefined, 'GET')
      case 'Search':
        return run(`${apiUrl}/klaus/imi/search?q=${encodeURIComponent(input)}`, undefined, 'GET')
    }
  }

  const suggestions: Record<Tab, string[]> = {
    'Meta-Analysis': ['Cross-dataset brand health synthesis', 'Compare awareness vs purchase intent trends'],
    'Anomalies': ['', 'automotive'],
    'Patterns': ['Brand trust patterns', 'Campaign decay rates'],
    'ML Predictions': ['Predict next quarter NPS by brand', 'Churn risk segmentation'],
    'Knowledge Graph': ['brand health', 'campaign effectiveness'],
    'Search': ['brand health', 'NPS benchmark'],
  }

  const placeholders: Record<Tab, string> = {
    'Meta-Analysis': 'Describe datasets or ask a cross-study question...',
    'Anomalies': 'Dataset name (leave empty for default)...',
    'Patterns': 'What patterns are you looking for?',
    'ML Predictions': 'Enter features or describe what to predict...',
    'Knowledge Graph': 'Search term to explore relationships...',
    'Search': 'Search across all IMI data...',
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Insights</h1>
        <p>AI-powered analysis across 55+ years of consumer research</p>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => { setTab(t); setResult(''); setError('') }}>
            {t}
          </button>
        ))}
      </div>

      <div className={styles.inputSection}>
        <textarea
          className={styles.textarea}
          placeholder={placeholders[tab]}
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={3}
        />
        <button className={styles.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader2 size={16} className={styles.spin} /> : null}
          {loading ? 'Analyzing...' : `Run ${tab}`}
        </button>
        <div className={styles.suggestions}>
          {suggestions[tab]?.map((s, i) => (
            <button key={i} className={styles.suggestionBtn} onClick={() => { setInput(s); }}>
              {s || '(default dataset)'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.resultSection}>
          <MarkdownContent content={result} />
        </div>
      )}
    </div>
  )
}
