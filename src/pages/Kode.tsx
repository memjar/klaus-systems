import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import styles from './Kode.module.css'

interface KodeMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  toolEvents?: { type: string; tool: string; preview?: string }[]
  responseTime?: number
}

export default function Kode({ apiUrl }: { apiUrl: string }) {
  const [messages, setMessages] = useState<KodeMessage[]>([
    { role: 'system', content: '> Klaus Terminal v2.0 — Connected to Qwen 32B\n> Type a command or question. Full tool access enabled.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
          message: msg,
          history: messages.filter(m => m.role !== 'system'),
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

            // Handle agent loop streaming events
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

  return (
    <div className={styles.container}>
      <div className={styles.terminal}>
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.line} ${styles[msg.role]}`}>
            {msg.role === 'user' && <span className={styles.prompt}>$</span>}
            {msg.role === 'assistant' && <span className={styles.prompt}>K</span>}
            <div className={styles.content}>
              {msg.toolEvents && msg.toolEvents.length > 0 && (
                <div className={styles.tools}>
                  {msg.toolEvents.map((ev, j) => (
                    <div key={j} className={styles.toolEvent}>
                      <span className={styles.toolIcon}>{ev.type === 'start' ? '⚙' : '✓'}</span>
                      <span className={styles.toolName}>{ev.tool}</span>
                      {ev.preview && <span className={styles.toolPreview}>{ev.preview.slice(0, 80)}</span>}
                    </div>
                  ))}
                </div>
              )}
              <pre className={styles.text}>{msg.content}</pre>
              {msg.responseTime && (
                <span className={styles.time}>{(msg.responseTime / 1000).toFixed(1)}s</span>
              )}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.content === '' && messages[messages.length - 1]?.toolEvents?.length === 0 && (
          <div className={`${styles.line} ${styles.assistant}`}>
            <span className={styles.prompt}>K</span>
            <Loader2 size={14} className={styles.spinner} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className={styles.inputArea}>
        <span className={styles.inputPrompt}>$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter command or question..."
          className={styles.input}
          disabled={loading}
          autoFocus
        />
        <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
