import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Plus, Terminal } from 'lucide-react'
import MarkdownContent from '../components/MarkdownContent'
import styles from './Kode.module.css'

const THINKING_MESSAGES = [
  'Thinking...',
  'On it...',
  'Working...',
  'Processing...',
  'Analyzing...',
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

interface KodeMessage {
  role: 'user' | 'assistant'
  content: string
  toolEvents?: { type: string; tool: string; preview?: string }[]
  responseTime?: number
}

export default function Kode({ apiUrl }: { apiUrl: string }) {
  const [messages, setMessages] = useState<KodeMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setMessages(prev => [...prev, { role: 'user', content: `Uploading ${file.name}...` }])
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
        content: `**${data.survey_name}** uploaded — ${data.total_n} respondents, ${data.questions_found} questions, format: ${data.format}\n\nYou can now ask questions about this data.`
      }])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setMessages(prev => [...prev, { role: 'assistant', content: `Upload failed: ${msg}` }])
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      inputRef.current?.focus()
    }
  }

  const sendMessage = async () => {
    const msg = input.trim()
    if (!msg || loading) return

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setLoading(true)

    const startTime = Date.now()
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          message: uploadedFile ? `[Context: user uploaded survey "${uploadedFile}"]\n${msg}` : msg,
          history: messages,
          agent: 'klaus-imi',
          use_tools: true,
          prefer_speed: true,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let fullContent = ''
      const toolEvents: KodeMessage['toolEvents'] = []

      setMessages(prev => [...prev, { role: 'assistant', content: '', toolEvents: [] }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.trim())

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)

            if (parsed.type === 'tool_start') {
              toolEvents.push({ type: 'start', tool: parsed.tool })
              const content = fullContent
              const events = [...toolEvents]
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content, toolEvents: events }
                return updated
              })
            } else if (parsed.type === 'tool_result') {
              toolEvents.push({ type: 'result', tool: parsed.tool, preview: parsed.preview })
              const content = fullContent
              const events = [...toolEvents]
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content, toolEvents: events }
                return updated
              })
            } else if (parsed.type === 'token') {
              fullContent += parsed.content || ''
              const content = fullContent
              const events = [...toolEvents]
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content, toolEvents: events }
                return updated
              })
            } else {
              // Legacy Ollama format
              const token = (parsed.message?.content || '').replace(/<\/?think>/g, '')
              if (token) {
                fullContent += token
                const content = fullContent
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content }
                  return updated
                })
              }
            }
          } catch {
            // skip malformed
          }
        }
      }

      const elapsed = Date.now() - startTime
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], responseTime: elapsed }
        return updated
      })

      if (!fullContent && toolEvents.length === 0) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: 'No response — check if Ollama is running.' }
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

  const isThinking = loading && messages.length > 0 &&
    messages[messages.length - 1]?.role === 'assistant' &&
    !messages[messages.length - 1]?.content &&
    (!messages[messages.length - 1]?.toolEvents || messages[messages.length - 1]?.toolEvents?.length === 0)

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><Terminal size={40} /></div>
            <h2>Klaus Kode</h2>
            <p>Research-grade AI terminal. Upload datasets, run analysis, ask anything about your IMI survey data.</p>
            <div className={styles.suggestions}>
              {['What datasets are available?', 'Summarize brand health trends', 'Compare GenZ vs Boomers', 'Show sponsorship ROI'].map(s => (
                <button key={s} className={styles.suggestion} onClick={() => { setInput(s); inputRef.current?.focus() }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
            <div className={styles.avatar}>
              {msg.role === 'user' ? 'J' : 'K'}
            </div>
            <div className={styles.bubble}>
              {msg.toolEvents && msg.toolEvents.length > 0 && (
                <div className={styles.toolActivity}>
                  {msg.toolEvents.map((ev, j) => (
                    <span key={j} className={`${styles.toolBadge} ${ev.type === 'start' ? styles.toolRunning : styles.toolDone}`}>
                      {ev.type === 'start' ? <Loader2 size={10} className={styles.toolSpin} /> : <span>&#10003;</span>}
                      {ev.tool}
                    </span>
                  ))}
                </div>
              )}
              <div className={styles.content}>
                {msg.role === 'assistant'
                  ? <MarkdownContent content={msg.content} />
                  : msg.content
                }
              </div>
              {msg.responseTime && (
                <span className={styles.time}>{(msg.responseTime / 1000).toFixed(1)}s</span>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.avatar}>K</div>
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
        <button type="button" className={styles.attachBtn} title="Upload dataset" onClick={() => fileInputRef.current?.click()} disabled={loading}>
          <Plus size={16} />
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Klaus anything..."
          className={styles.input}
          disabled={loading}
          autoFocus
        />
        <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()}>
          {loading ? <Loader2 size={16} className={styles.spinner} /> : <Send size={16} />}
        </button>
      </form>
    </div>
  )
}
