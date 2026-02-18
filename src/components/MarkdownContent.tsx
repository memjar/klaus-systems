import { useState, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import styles from './MarkdownContent.module.css'

function TableWrapper({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const copyTable = useCallback(() => {
    const table = scrollRef.current?.querySelector('table')
    if (!table) return
    const rows = table.querySelectorAll('tr')
    const tsv = Array.from(rows).map(row =>
      Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || '').join('\t')
    ).join('\n')
    navigator.clipboard.writeText(tsv)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  return (
    <div className={styles.tableWrapper}>
      <button className={`${styles.copyBtn} ${copied ? styles.copied : ''}`} onClick={copyTable}>
        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
      <div className={styles.tableScroll} ref={scrollRef}>
        {children}
      </div>
    </div>
  )
}

export default function MarkdownContent({ content, responseTime }: { content: string; responseTime?: number }) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => <TableWrapper>{<table>{children}</table>}</TableWrapper>,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const isBlock = typeof children === 'string' && children.includes('\n')
            if (match || isBlock) {
              return (
                <div className={styles.codeBlock}>
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match?.[1] || 'text'}
                    PreTag="pre"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              )
            }
            return <code className={className} {...props}>{children}</code>
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {responseTime !== undefined && responseTime > 0 && (
        <div className={styles.responseTime}>Responded in {(responseTime / 1000).toFixed(1)}s</div>
      )}
    </div>
  )
}
