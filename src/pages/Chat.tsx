import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Paperclip, FileText, TrendingUp, BookOpen, AlertTriangle, Copy, BarChart3, FileDown } from 'lucide-react'
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
    <div className={styles.thinkingContainer}>
      <div className={styles.thinkingRing}>
        <div className={styles.ringInner} />
      </div>
      <div className={styles.thinkingContent}>
        <span className={styles.thinkingText}>{baseMessage}{dots}</span>
        <div className={styles.scanBar} />
      </div>
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
  charts?: ChartData[]
  responseTime?: number
  tools?: ToolActivity[]
  thinking?: string
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5', '#7c3aed', '#5b21b6']

function parseMarkdownTables(content: string): ChartData[] {
  const charts: ChartData[] = []
  // Split content into lines, find table blocks
  const lines = content.split('\n')

  let i = 0
  while (i < lines.length) {
    // Look for header row: | col | col | ... |
    const headerMatch = lines[i]?.match(/^\|(.+)\|$/)
    if (!headerMatch) { i++; continue }

    // Next line must be separator: |---|---|
    const sepLine = lines[i + 1]
    if (!sepLine || !/^\|[\s:_-]+(\|[\s:_-]+)+\|$/.test(sepLine)) { i++; continue }

    const headers = headerMatch[1].split('|').map(h => h.trim()).filter(Boolean)
    const dataRows: Record<string, unknown>[] = []
    let j = i + 2
    while (j < lines.length) {
      const rowMatch = lines[j]?.match(/^\|(.+)\|$/)
      if (!rowMatch) break
      const cells = rowMatch[1].split('|').map(c => c.trim())
      if (cells.length >= headers.length) {
        const row: Record<string, unknown> = {}
        headers.forEach((h, idx) => {
          const raw = (cells[idx] || '').replace(/\*\*/g, '').replace(/[$,%]/g, '').replace(/,/g, '').trim()
          const num = parseFloat(raw)
          row[h] = isNaN(num) ? cells[idx]?.replace(/\*\*/g, '').trim() : num
        })
        dataRows.push(row)
      }
      j++
    }

    if (dataRows.length < 2) { i = j; continue }

    // Detect numeric columns
    const numericCols = headers.filter(h =>
      dataRows.every(r => typeof r[h] === 'number')
    )
    if (numericCols.length === 0) { i = j; continue }

    // Find nearest heading above for title
    let title = 'Data'
    for (let k = i - 1; k >= 0; k--) {
      const headingMatch = lines[k]?.match(/^#{1,4}\s+(.+)/)
      if (headingMatch) { title = headingMatch[1]; break }
    }

    // Decide chart type: pie if 2 cols and values sum ~100
    const labelCol = headers.find(h => !numericCols.includes(h)) || headers[0]
    if (numericCols.length === 1 && headers.length === 2) {
      const sum = dataRows.reduce((s, r) => s + (r[numericCols[0]] as number), 0)
      if (sum > 90 && sum < 110) {
        charts.push({
          chart: 'pie',
          title,
          data: dataRows.map(r => ({ name: String(r[labelCol]), value: r[numericCols[0]] })),
        })
        i = j; continue
      }
    }

    // Default: bar chart
    charts.push({
      chart: 'bar',
      title,
      data: dataRows.map(r => {
        const d: Record<string, unknown> = { name: String(r[labelCol]) }
        numericCols.forEach(k => { d[k] = r[k] })
        return d
      }),
      xKey: 'name',
      yKeys: numericCols,
    })

    i = j
  }

  return charts
}

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
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
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

      // Auto-generate charts from markdown tables in the response
      if (fullContent) {
        const charts = parseMarkdownTables(fullContent)
        if (charts.length > 0) {
          updateLast({ charts })
        }
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
              {msg.charts?.map((c, ci) => <InlineChart key={ci} chart={c} />)}
              {msg.role === 'assistant' && msg.content && (
                <div className={styles.msgActions}>
                  <button className={styles.msgActionBtn} onClick={() => { navigator.clipboard.writeText(msg.content); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1500) }}>
                    <Copy size={12} /> {copiedIdx === i ? 'Copied!' : 'Copy'}
                  </button>
                  <button className={styles.msgActionBtn} onClick={() => sendMessage('Turn the above findings into a visual chart')}>
                    <BarChart3 size={12} /> Add Chart
                  </button>
                  <button className={styles.msgActionBtn} onClick={() => { const blob = new Blob([msg.content], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `klaus-report-${i}.md`; a.click() }}>
                    <FileDown size={12} /> Save Report
                  </button>
                </div>
              )}
              {msg.content.includes('uploaded successfully') && i === messages.length - 1 && !loading && (
                <div className={styles.postUploadActions}>
                  <p className={styles.postUploadLabel}>What would you like to do?</p>
                  <div className={styles.postUploadGrid}>
                    {[
                      { label: 'Summarize Key Findings', prompt: 'Give me a summary of the key findings from this survey — top-line results, notable patterns, and anything surprising.' },
                      { label: 'Break Down by Segment', prompt: 'Break down the results by demographic segments (age, gender, region). Show me where the biggest differences are.' },
                      { label: 'Compare with Benchmarks', prompt: 'Compare these results against industry benchmarks or our other datasets. Where do we over/under-index?' },
                      { label: 'Generate Client Report', prompt: 'Generate a client-ready executive summary of this data with key insights, charts, and recommended actions.' },
                    ].map(action => (
                      <button
                        key={action.label}
                        className={styles.postUploadBtn}
                        onClick={() => sendMessage(action.prompt)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
