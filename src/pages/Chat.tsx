import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Paperclip, FileText, TrendingUp, BookOpen, AlertTriangle, Copy, BarChart3, FileDown, RotateCcw, ChevronsRight } from 'lucide-react'
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

const CHART_COLORS = ['#4ade80', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#a78bfa']

function parseContentForCharts(content: string): ChartData[] {
  const charts: ChartData[] = []

  // Strategy 1: Parse markdown tables (| col | col |)
  const lines = content.split('\n')
  let i = 0
  while (i < lines.length) {
    const headerMatch = lines[i]?.match(/^\|(.+)\|$/)
    if (!headerMatch) { i++; continue }
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
    if (dataRows.length >= 2) {
      const numericCols = headers.filter(h => dataRows.every(r => typeof r[h] === 'number'))
      if (numericCols.length > 0) {
        let title = 'Data'
        for (let k = i - 1; k >= 0; k--) {
          const m = lines[k]?.match(/^#{1,4}\s+(.+)/)
          if (m) { title = m[1]; break }
        }
        const labelCol = headers.find(h => !numericCols.includes(h)) || headers[0]
        const sum = numericCols.length === 1 ? dataRows.reduce((s, r) => s + (r[numericCols[0]] as number), 0) : 0
        if (numericCols.length === 1 && headers.length === 2 && sum > 90 && sum < 110) {
          charts.push({ chart: 'pie', title, data: dataRows.map(r => ({ name: String(r[labelCol]), value: r[numericCols[0]] })) })
        } else {
          charts.push({ chart: 'bar', title, data: dataRows.map(r => { const d: Record<string, unknown> = { name: String(r[labelCol]) }; numericCols.forEach(k => { d[k] = r[k] }); return d }), xKey: 'name', yKeys: numericCols })
        }
      }
    }
    i = j || i + 1
  }

  // Strategy 2: Parse ASCII bar charts and label: value% patterns from code blocks and plain text
  // Matches lines like: "Label  ████ 25%" or "Label: 25% Very Likely" or "- Label — 25%"
  if (charts.length === 0) {
    const sections: { title: string; items: { name: string; value: number }[] }[] = []
    let currentTitle = ''
    let currentItems: { name: string; value: number }[] = []

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]
      // Detect section headers (markdown headings, bold text, or question labels)
      const headingMatch = line.match(/^#{1,4}\s+(.+)/) || line.match(/^\*\*(.+?)\*\*/) || line.match(/^(Q\d+:.+)/)
      if (headingMatch && currentItems.length === 0) {
        currentTitle = headingMatch[1].replace(/\*\*/g, '').trim()
        continue
      }

      // Match: "Label  ████ 25%" or "Label    ██ 09%" (ASCII bar chart)
      const asciiMatch = line.match(/^\s*(.+?)\s{2,}[█▓░▒■]+\s*(\d+)%/)
      // Match: "Label: 25%" or "- Label — 25%" or "Label  25%"
      const labelValMatch = !asciiMatch && line.match(/^\s*[-•*]?\s*(.+?)[\s:—–-]+(\d+(?:\.\d+)?)\s*%/)

      const match = asciiMatch || labelValMatch
      if (match) {
        const name = match[1].replace(/\*\*/g, '').replace(/^[-•*]\s*/, '').trim()
        const value = parseFloat(match[2])
        if (name && !isNaN(value) && name.length < 60) {
          currentItems.push({ name, value })
        }
      } else if (currentItems.length >= 2 && (line.trim() === '' || line.match(/^#{1,4}\s/) || line.match(/^(Q\d+:)/))) {
        // End of section
        sections.push({ title: currentTitle || 'Data', items: [...currentItems] })
        currentItems = []
        const newHeading = line.match(/^#{1,4}\s+(.+)/) || line.match(/^(Q\d+:.+)/)
        currentTitle = newHeading ? newHeading[1].replace(/\*\*/g, '').trim() : ''
      }
    }
    if (currentItems.length >= 2) {
      sections.push({ title: currentTitle || 'Data', items: [...currentItems] })
    }

    // Merge sections with same/similar title into one chart, cap at 5 charts
    const merged = new Map<string, { name: string; value: number }[]>()
    for (const s of sections) {
      const key = s.title.replace(/\s*\(cont'd?\).*$/i, '').trim() || 'Data'
      const existing = merged.get(key) || []
      existing.push(...s.items)
      merged.set(key, existing)
    }

    for (const [title, items] of merged) {
      if (charts.length >= 5) break
      const sum = items.reduce((s, it) => s + it.value, 0)
      if (items.length <= 8 && sum > 90 && sum < 110) {
        charts.push({ chart: 'pie', title, data: items.map(it => ({ name: it.name, value: it.value })) })
      } else {
        // Limit to top 12 items for readability
        const capped = items.slice(0, 12)
        charts.push({ chart: 'bar', title, data: capped.map(it => ({ name: it.name, value: it.value })), xKey: 'name', yKeys: ['value'] })
      }
    }
  }

  return charts
}

function InlineChart({ chart }: { chart: ChartData }) {
  return (
    <div style={{ marginTop: 16, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>{chart.title}</div>
      <ResponsiveContainer width="100%" height={chart.chart === 'pie' ? 260 : Math.max(200, (chart.data.length || 0) * 28)}>
        {chart.chart === 'pie' ? (
          <PieChart>
            <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40} paddingAngle={2} label={({ name, value }) => `${name}: ${value}%`} labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}>
              {chart.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        ) : (
          <BarChart data={chart.data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis type="category" dataKey={chart.xKey || 'name'} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={120} />
            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            {chart.yKeys
              ? chart.yKeys.map((k, i) => <Bar key={k} dataKey={k} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[0, 4, 4, 0]} barSize={18} />)
              : <Bar dataKey={chart.yKey || 'value'} fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} barSize={18} />
            }
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

interface Briefing {
  date: string
  whereYouWere: string
  whatYouFound: string
  whereGoing: string
  lastMessages: Message[]
}

function generateBriefing(msgs: Message[]): Briefing | null {
  if (msgs.length < 2) return null
  const userMsgs = msgs.filter(m => m.role === 'user')
  const assistantMsgs = msgs.filter(m => m.role === 'assistant' && m.content)
  if (!userMsgs.length || !assistantMsgs.length) return null
  return {
    date: new Date().toISOString(),
    whereYouWere: userMsgs[0].content.slice(0, 120),
    whatYouFound: assistantMsgs[assistantMsgs.length - 1].content.slice(0, 120),
    whereGoing: userMsgs[userMsgs.length - 1].content.slice(0, 120),
    lastMessages: msgs.slice(-10),
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export default function Chat({ apiUrl }: { apiUrl: string }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try { const m = localStorage.getItem(`klaus_messages_${localStorage.getItem('klaus_user') || 'default'}`); return m ? JSON.parse(m) : [] } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const klausUser = localStorage.getItem('klaus_user') || 'default'
  const briefingKey = `klaus_briefing_${klausUser}`
  const messagesKey = `klaus_messages_${klausUser}`
  const [briefing, setBriefing] = useState<Briefing | null>(() => {
    try { const b = localStorage.getItem(briefingKey); return b ? JSON.parse(b) : null } catch { return null }
  })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-save briefing on unload and when messages change
  useEffect(() => {
    const save = () => {
      const b = generateBriefing(messages)
      if (b) localStorage.setItem(briefingKey, JSON.stringify(b))
    }
    window.addEventListener('beforeunload', save)
    return () => window.removeEventListener('beforeunload', save)
  }, [messages])

  useEffect(() => {
    const b = generateBriefing(messages)
    if (b) localStorage.setItem(briefingKey, JSON.stringify(b))
    // Persist full messages per user (cap at last 50 to avoid quota issues)
    try { localStorage.setItem(messagesKey, JSON.stringify(messages.slice(-50))) } catch { /* quota */ }
  }, [messages])

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
          user: klausUser,
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
        const charts = parseContentForCharts(fullContent)
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
          briefing ? (
            <div className={styles.empty}>
              <div className={styles.briefing}>
                <span className={styles.briefingDate}>{timeAgo(briefing.date)}</span>
                <div className={styles.briefingLine}><span className={styles.briefingLabel}>You were exploring:</span> {briefing.whereYouWere}</div>
                <div className={styles.briefingLine}><span className={styles.briefingLabel}>Klaus found:</span> {briefing.whatYouFound}</div>
                <div className={styles.briefingLine}><span className={styles.briefingLabel}>Next up:</span> {briefing.whereGoing}</div>
                <div className={styles.briefingActions}>
                  <button className={styles.continueBtn} onClick={() => { setMessages(briefing.lastMessages); setBriefing(null); localStorage.removeItem(briefingKey) }}>Continue</button>
                  <button className={styles.newBtn} onClick={() => { setBriefing(null); localStorage.removeItem(briefingKey) }}>Something new</button>
                </div>
              </div>
            </div>
          ) : (
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
          )
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
                  <button className={styles.msgActionBtn} onClick={() => {
                    const charts = parseContentForCharts(msg.content)
                    if (charts.length > 0) {
                      setMessages(prev => { const u = [...prev]; u[i] = { ...u[i], charts }; return u })
                    } else {
                      sendMessage('Summarize the key data points from above as a markdown table with labels and percentages')
                    }
                  }}>
                    <BarChart3 size={12} /> {msg.charts?.length ? 'Refresh Chart' : 'Add Chart'}
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
        {/* Retry & Continue buttons */}
        {!loading && messages.length > 0 && (() => {
          const last = messages[messages.length - 1]
          const isError = last.role === 'assistant' && (last.content.startsWith('Connection error') || last.content.startsWith('No response') || last.content.startsWith('❌'))
          const isTruncated = last.role === 'assistant' && last.content.length > 800 && !last.content.trimEnd().endsWith('.') && !last.content.trimEnd().endsWith('!') && !last.content.trimEnd().endsWith('?') && !last.content.trimEnd().endsWith('```') && !last.content.trimEnd().endsWith('---')
          if (!isError && !isTruncated) return null
          return (
            <div className={styles.retryBar}>
              {isError && (
                <button className={styles.retryBtn} onClick={() => {
                  // Find last user message and retry it
                  const lastUser = [...messages].reverse().find(m => m.role === 'user')
                  if (lastUser) {
                    // Remove the error message
                    setMessages(prev => prev.slice(0, -1))
                    setTimeout(() => sendMessage(lastUser.content), 50)
                  }
                }}>
                  <RotateCcw size={14} /> Retry
                </button>
              )}
              {isTruncated && (
                <button className={styles.continueGenBtn} onClick={() => {
                  sendMessage('Continue your previous response from exactly where you left off. Do not repeat anything — pick up mid-sentence if needed.')
                }}>
                  <ChevronsRight size={14} /> Continue
                </button>
              )}
            </div>
          )
        })()}
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
