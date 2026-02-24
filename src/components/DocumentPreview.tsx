import { FileText, Download, ExternalLink } from 'lucide-react'
import styles from './DocumentPreview.module.css'

interface DocumentPreviewProps {
  docId: string
  title: string
  format: 'pdf' | 'html'
  apiUrl: string
}

export default function DocumentPreview({ docId, title, apiUrl }: DocumentPreviewProps) {
  const handleDownloadPDF = () => {
    const a = document.createElement('a')
    a.href = `${apiUrl}/klaus/imi/document/${docId}?format=pdf`
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.pdf`
    a.click()
  }

  const handleViewHTML = () => {
    window.open(`${apiUrl}/klaus/imi/document/${docId}?format=html`, '_blank')
  }

  const handleDownloadHTML = () => {
    const a = document.createElement('a')
    a.href = `${apiUrl}/klaus/imi/document/${docId}?format=html`
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.html`
    a.click()
  }

  return (
    <div className={styles.card}>
      <div className={styles.icon}>
        <FileText size={24} />
      </div>
      <div className={styles.info}>
        <span className={styles.title}>{title}</span>
        <span className={styles.meta}>Klaus IMI Document</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={handleDownloadPDF} title="Download PDF">
          <Download size={14} /> PDF
        </button>
        <button className={styles.btn} onClick={handleViewHTML} title="View HTML">
          <ExternalLink size={14} /> View
        </button>
        <button className={styles.btnSecondary} onClick={handleDownloadHTML} title="Download HTML">
          <Download size={14} /> HTML
        </button>
      </div>
    </div>
  )
}
