import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Paperclip } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import MarkdownContent from '../components/MarkdownContent'
import styles from './Chat.module.css'

const THINKING_PHRASES = [
  'Analyzing data',
  'Cross-referencing sources',
  'Evaluating patterns',
  'Synthesizing insights',
  'Processing context',
  'Reviewing methodology',
  'Correlating findings',
  'Generating response',
]

function ThinkingAnimation() {
  const [index, setIndex] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % THINKING_PHRASES.length)
        setFade(true)
      }, 300)
    }, 2400)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className={`${styles.thinking} ${fade ? styles.fadeIn : styles.fadeOut}`}>
      {THINKING_PHRASES[index]}...
    </span>
  )
}

interface ChartData {
  chart: 'bar' | 'pie'
  title: string
  data: Record<string, unknown>[]
  xKey?: string
  yKey?: string
  yKeys?: string[]
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  chart?: ChartData
  responseTime?: number
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5', '#7c3aed', '#5b21b6']

function InlineChart({ chart }: { chart: ChartData }) {
  return (
    <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, opacity: 0.8 }}>{chart.title}</div>
      <ResponsiveContainer width="100%" height={200}>
        {chart.chart === 'pie' ? (
          <PieChart>
            <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}%`}>
              {chart.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : (
          <BarChart data={chart.data}>
            <XAxis dataKey={chart.xKey || 'name'} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {chart.yKeys
              ? chart.yKeys.map((k, i) => <Bar key={k} dataKey={k} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />)
              : <Bar dataKey={chart.yKey || 'value'} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            }
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export default function Chat({ apiUrl }: { apiUrl: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return

    const userMsg: Message = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const startTime = Date.now()
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages,
          agent: 'klaus-imi',
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Handle NDJSON streaming from backend
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let fullContent = ''

      // Add empty assistant message that we'll stream into
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.trim())

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            const token = parsed.message?.content || ''
            if (token) {
              fullContent += token
              const content = fullContent
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content }
                return updated
              })
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      // Record response time
      const elapsed = Date.now() - startTime
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], responseTime: elapsed }
        return updated
      })

      // Auto-detect if we should show a chart
      const chartKeywords = /\b(nps|brand|market share|awareness|competitive|benchmark)\b/i
      if (fullContent && chartKeywords.test(msg)) {
        try {
          const chartType = /market.?share/i.test(msg) ? 'market_share'
            : /awareness/i.test(msg) ? 'awareness' : 'nps_comparison'
          const chartRes = await fetch(`${apiUrl}/klaus/imi/visualize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: chartType }),
          })
          if (chartRes.ok) {
            const chartData = await chartRes.json() as ChartData
            if (chartData.data?.length) {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { ...updated[updated.length - 1], chart: chartData }
                return updated
              })
            }
          }
        } catch { /* chart is optional enhancement */ }
      }

      // If we got no content at all, show error
      if (!fullContent) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: 'No response from model — check if Ollama is running.' }
          return updated
        })
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error — backend may be offline.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const SUGGESTIONS = [
    "What's Tim Hortons' NPS score?",
    'Compare Gen Z purchase drivers across datasets',
    'Brand health summary for all tracked brands',
    'Show me the competitive benchmark data',
    'What does the say-do gap analysis reveal?',
    'Sponsorship ROI insights',
  ]

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyK}>K</span>
            <h2>Klaus IMI Research Intelligence</h2>
            <p>Powered by Qwen 32B — trained on 55+ years of IMI consumer research across 18 countries covering 70% of global GDP.</p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map(s => (
                <button key={s} className={styles.suggestion} onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
            {msg.role === 'assistant' && <span className={styles.avatar}>K</span>}
            <div className={styles.bubble}>
              <div className={styles.content}>
                <MarkdownContent content={msg.content} responseTime={msg.responseTime} />
              </div>
              {msg.chart && <InlineChart chart={msg.chart} />}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <span className={styles.avatar}>K</span>
            <div className={styles.bubble}>
              <Loader2 size={16} className={styles.spinner} />
              <ThinkingAnimation />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className={styles.inputArea}>
        <button type="button" className={styles.attachBtn} title="Upload survey data">
          <Paperclip size={18} />
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Klaus about IMI research data..."
          className={styles.input}
          disabled={loading}
        />
        <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
