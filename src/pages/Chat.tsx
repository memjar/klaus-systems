import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Paperclip, FileText, TrendingUp, BookOpen, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import MarkdownContent from '../components/MarkdownContent'
import styles from './Chat.module.css'

const THINKING_MESSAGES = [
  'Thinking...',
  'On it...',
  'Working...',
  'Let me see...',
  'Processing...',
  'Almost ready...',
]

function ThinkingAnimation() {
  const [phase, setPhase] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => (p + 1) % THINKING_MESSAGES.length)
    }, 600)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 300)
    return () => clearInterval(dotInterval)
  }, [])

  const baseMessage = THINKING_MESSAGES[phase].replace(/\.+$/, '')

  return (
    <div className={styles.thinkingTextOnly}>
      <span className={styles.thinkingText}>{baseMessage}{dots}</span>
    </div>
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

interface ToolActivity {
  tool: string
  status: 'running' | 'done'
  preview?: string
  durationMs?: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  chart?: ChartData
  responseTime?: number
  tools?: ToolActivity[]
  thinking?: string
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
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setMessages(prev => [...prev, { role: 'user', content: `📎 Uploading ${file.name}...` }])
    setLoading(true)

    try {
      const res = await fetch(`${apiUrl}/klaus/imi/upload-survey`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setUploadedFile(data.survey_name)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **${data.survey_name}** uploaded successfully.\n\n- **Respondents:** ${data.total_n}\n- **Questions:** ${data.questions_found}\n- **Segments:** ${data.segments?.join(', ') || 'none'}\n- **Format:** ${data.format}\n\nYou can now ask questions about this data.`
      }])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Upload failed: ${msg}` }])
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      inputRef.current?.focus()
    }
  }

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
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          message: uploadedFile ? `[Context: user uploaded survey "${uploadedFile}"]\n${msg}` : msg,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          agent: 'klaus-imi',
          prefer_speed: true,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let fullContent = ''
      const toolsUsed: ToolActivity[] = []

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const updateLast = (patch: Partial<Message>) => {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], ...patch }
          return updated
        })
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.trim())

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)

            // Agent loop event format: {type: "token"|"tool_start"|"tool_result"|"thinking"|"done"}
            if (parsed.type === 'token') {
              fullContent += parsed.content || ''
              updateLast({ content: fullContent, tools: [...toolsUsed] })
            } else if (parsed.type === 'tool_start') {
              toolsUsed.push({ tool: parsed.tool, status: 'running' })
              updateLast({ tools: [...toolsUsed] })
            } else if (parsed.type === 'tool_result') {
              const last = [...toolsUsed].reverse().find((t: ToolActivity) => t.tool === parsed.tool && t.status === 'running')
              if (last) {
                last.status = 'done'
                last.preview = parsed.preview
                last.durationMs = parsed.duration_ms
              }
              updateLast({ tools: [...toolsUsed] })
            } else if (parsed.type === 'thinking') {
              updateLast({ thinking: parsed.content })
            } else if (parsed.type === 'done') {
              // final event
            } else if (parsed.message?.content) {
              // Raw Ollama streaming format (non-agent path) — strip think tags
              const clean = parsed.message.content.replace(/<\/?think>/g, '')
              if (clean) {
                fullContent += clean
                updateLast({ content: fullContent })
              }
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      const elapsed = Date.now() - startTime
      updateLast({ responseTime: elapsed })

      // Auto-detect if we should show a chart
      const chartKeywords = /\b(nps|brand|market share|awareness|competitive|benchmark)\b/i
      if (fullContent && chartKeywords.test(msg)) {
        try {
          const chartType = /market.?share/i.test(msg) ? 'market_share'
            : /awareness/i.test(msg) ? 'awareness' : 'nps_comparison'
          const chartRes = await fetch(`${apiUrl}/klaus/imi/visualize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
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
    'What does the say-do gap analysis reveal?',
  ]

  const IMI_FEATURES = [
    { icon: <FileText size={16} />, label: 'Report', prompt: 'Generate a full IMI brand health report with executive summary, key metrics table, competitive analysis, and strategic recommendations' },
    { icon: <TrendingUp size={16} />, label: 'Meta-Analysis', prompt: 'Run a multi-study meta-analysis across all available IMI datasets — identify cross-study patterns, convergent findings, and statistical trends' },
    { icon: <BookOpen size={16} />, label: 'Case Studies', prompt: 'Find the most relevant IMI case studies with ROI data, methodology details, and lessons learned across markets' },
    { icon: <AlertTriangle size={16} />, label: 'Anomalies', prompt: 'Run anomaly detection across all IMI datasets — flag unusual patterns, outliers, sudden shifts in brand metrics, and data quality issues' },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyK}>K</span>
            <h2>Klaus IMI Research Intelligence</h2>
            <p>Hydra-routed AI — auto-selects optimal model per query. 55+ years of IMI consumer research, 18 countries, 70% of global GDP.</p>
            <div className={styles.features}>
              {IMI_FEATURES.map(f => (
                <button key={f.label} className={styles.featureBtn} onClick={() => sendMessage(f.prompt)}>
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
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
              {msg.tools && msg.tools.length > 0 && (
                <div className={styles.toolActivity}>
                  {msg.tools.map((t, ti) => (
                    <span key={ti} className={`${styles.toolBadge} ${t.status === 'running' ? styles.toolRunning : styles.toolDone}`}>
                      {t.status === 'running' ? <Loader2 size={10} className={styles.toolSpin} /> : null}
                      {t.tool}{t.durationMs ? ` (${t.durationMs}ms)` : ''}
                    </span>
                  ))}
                </div>
              )}
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
              <ThinkingAnimation />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className={styles.inputArea}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.json"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button type="button" className={styles.attachBtn} title="Upload survey data (.xlsx, .csv, .json)" onClick={() => fileInputRef.current?.click()} disabled={loading}>
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
