import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import styles from './Chat.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Chat({ apiUrl }: { apiUrl: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${apiUrl}/imi/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages,
          agent: 'klaus-imi',
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.message || 'No response' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error — backend offline' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyK}>K</span>
            <h2>Klaus IMI Research Intelligence</h2>
            <p>Ask me anything about IMI's market research data, brand health metrics, consumer insights, or competitive analysis.</p>
            <div className={styles.suggestions}>
              {[
                "What's Tim Hortons' NPS score?",
                'Compare Gen Z purchase drivers across datasets',
                'Brand health summary for all tracked brands',
                'What competitive advantages does Klaus have?',
              ].map(s => (
                <button key={s} className={styles.suggestion} onClick={() => { setInput(s) }}>
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
              <pre className={styles.content}>{msg.content}</pre>
            </div>
          </div>
        ))}
        {loading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <span className={styles.avatar}>K</span>
            <div className={styles.bubble}>
              <Loader2 size={16} className={styles.spinner} />
              <span className={styles.thinking}>Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className={styles.inputArea}>
        <input
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
