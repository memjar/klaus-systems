import { useState, useEffect, useRef } from 'react'
import { FileText, Search, Download, Upload, Loader2, RefreshCw, Cloud, HardDrive } from 'lucide-react'
import styles from './Explorer.module.css'

interface SurveyFile {
  id: string
  name: string
  total_n: number
  source: 'backend' | 'drive'
  drive_id?: string
  web_link?: string
  modified?: string
  size?: number
}

function deriveCategory(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('brand_health') || n.includes('brand_trust')) return 'Brand Health'
  if (n.includes('competitive') || n.includes('benchmark')) return 'Competitive'
  if (n.includes('sentiment') || n.includes('buy_canadian') || n.includes('buy_local')) return 'Sentiment'
  if (n.includes('genz') || n.includes('gen_z') || n.includes('lifestyle')) return 'Segmentation'
  if (n.includes('promotion') || n.includes('roi') || n.includes('sponsorship')) return 'ROI'
  if (n.includes('say_do') || n.includes('purchase_driver')) return 'Behavioral'
  if (n.includes('ad_pretest') || n.includes('campaign')) return 'Advertising'
  if (n.includes('sport') || n.includes('fandom') || n.includes('viewership')) return 'Sports'
  if (n.includes('tariff') || n.includes('made_in_canada')) return 'Trade'
  if (n.includes('marketing') || n.includes('effectiveness')) return 'Marketing'
  return 'Other'
}

export default function Explorer({ apiUrl }: { apiUrl: string }) {
  const [files, setFiles] = useState<SurveyFile[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = async () => {
    setLoading(true)
    const merged: SurveyFile[] = []

    // Fetch from backend survey store
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/surveys`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
      if (res.ok) {
        const data = await res.json()
        for (const s of data.surveys || []) {
          merged.push({
            id: s.id,
            name: s.name || s.id,
            total_n: s.total_n || 0,
            source: 'backend',
          })
        }
      }
    } catch { /* backend offline */ }

    // Fetch from Google Drive
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/drive/files`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
      if (res.ok) {
        const data = await res.json()
        const backendNames = new Set(merged.map(f => f.name.toLowerCase().replace(/ /g, '_')))
        for (const f of data.files || []) {
          const nameKey = f.name.replace(/\.\w+$/, '').toLowerCase()
          if (!backendNames.has(nameKey)) {
            merged.push({
              id: f.id,
              name: f.name,
              total_n: 0,
              source: 'drive',
              drive_id: f.id,
              web_link: f.web_link,
              modified: f.modified,
              size: f.size,
            })
          } else {
            // Annotate existing with drive info
            const existing = merged.find(m => m.name.toLowerCase().replace(/ /g, '_') === nameKey)
            if (existing) {
              existing.drive_id = f.id
              existing.web_link = f.web_link
            }
          }
        }
      }
    } catch { /* drive not configured */ }

    setFiles(merged)
    setLoading(false)
  }

  useEffect(() => { fetchFiles() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/upload-survey`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body: formData,
      })
      if (res.ok) {
        await fetchFiles()
      }
    } catch { /* */ }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const categories = ['All', ...Array.from(new Set(files.map(f => deriveCategory(f.name))))]

  const filtered = files.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || deriveCategory(f.name) === category
    return matchSearch && matchCat
  })

  const totalRecords = files.reduce((sum, f) => sum + f.total_n, 0)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Data Explorer</h1>
          <p>
            {loading ? 'Loading...' : `${files.length} IMI research datasets — ${totalRecords.toLocaleString()} total records`}
          </p>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.search}
            placeholder="Search datasets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.categories}>
          {categories.map(c => (
            <button
              key={c}
              className={`${styles.catBtn} ${category === c ? styles.catActive : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.json"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
        <button className={styles.exportBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={14} className={styles.spin} /> : <Upload size={14} />}
          Upload Survey
        </button>
        <button className={styles.exportBtn} onClick={fetchFiles} disabled={loading}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Dataset</span>
          <span>Category</span>
          <span>Records</span>
          <span>Source</span>
        </div>
        {filtered.map(f => (
          <div key={f.id} className={styles.row}>
            <div className={styles.fileCell}>
              <FileText size={14} className={styles.fileIcon} />
              <span className={styles.fileName}>{f.name}</span>
            </div>
            <span className={styles.category}>
              <span className={styles.catTag}>{deriveCategory(f.name)}</span>
            </span>
            <span className={styles.records}>{f.total_n || '—'}</span>
            <div className={styles.fileCell}>
              {f.drive_id ? <Cloud size={12} style={{ color: 'var(--green)', opacity: 0.7 }} /> : <HardDrive size={12} style={{ color: 'var(--text-muted)' }} />}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.drive_id ? 'Drive' : 'Local'}</span>
              {f.web_link && (
                <a href={f.web_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--green)' }}>
                  Open
                </a>
              )}
              {f.drive_id && (
                <a
                  href={`${apiUrl}/klaus/imi/drive/download/${f.drive_id}`}
                  style={{ fontSize: 11, color: 'var(--text-secondary)' }}
                >
                  <Download size={11} />
                </a>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && !loading && (
          <div className={styles.noResults}>No datasets match your search.</div>
        )}
        {loading && (
          <div className={styles.noResults}>
            <Loader2 size={16} className={styles.spin} /> Loading datasets...
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <span>{filtered.length} of {files.length} datasets shown</span>
        <button className={styles.exportBtn} onClick={() => {
          const csv = ['name,category,records,source']
          files.forEach(f => csv.push(`${f.name},${deriveCategory(f.name)},${f.total_n},${f.source}`))
          const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = 'imi_datasets_catalog.csv'
          a.click()
        }}>
          <Download size={14} />
          Export Catalog
        </button>
      </div>
    </div>
  )
}
