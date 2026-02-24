import { useState, useEffect } from 'react'
import { Database, Search, Loader2, RefreshCw, ChevronDown, ChevronRight, Table2, HardDrive, Plug } from 'lucide-react'
import styles from './DataSources.module.css'

interface DatasetColumn {
  name: string
  type: string
}

interface Dataset {
  id: string
  name: string
  row_count: number
  column_count: number
  source_type: string
}

interface Connection {
  id: string
  name: string
  type: string
  status: string
}

export default function DataSources({ apiUrl }: { apiUrl: string }) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [schemaMap, setSchemaMap] = useState<Record<string, DatasetColumn[]>>({})
  const [schemaLoading, setSchemaLoading] = useState<string | null>(null)

  const headers = { 'ngrok-skip-browser-warning': 'true' }

  const fetchData = async () => {
    setLoading(true)

    const [datasetsRes, connectionsRes] = await Promise.allSettled([
      fetch(`${apiUrl}/klaus/imi/warehouse/datasets`, { headers }),
      fetch(`${apiUrl}/klaus/imi/connections/list`, { headers }),
    ])

    if (datasetsRes.status === 'fulfilled' && datasetsRes.value.ok) {
      const data = await datasetsRes.value.json()
      setDatasets(data.datasets || data || [])
    }

    if (connectionsRes.status === 'fulfilled' && connectionsRes.value.ok) {
      const data = await connectionsRes.value.json()
      setConnections(data.connections || data || [])
    }

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const fetchSchema = async (datasetId: string) => {
    if (schemaMap[datasetId]) return
    setSchemaLoading(datasetId)
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/warehouse/schema/${datasetId}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setSchemaMap(prev => ({ ...prev, [datasetId]: data.columns || data.schema || [] }))
      }
    } catch { /* */ }
    setSchemaLoading(null)
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      fetchSchema(id)
    }
  }

  const filtered = datasets.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalRows = datasets.reduce((sum, d) => sum + (d.row_count || 0), 0)
  const totalCols = datasets.reduce((sum, d) => sum + (d.column_count || 0), 0)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Data Sources</h1>
          <p>
            {loading ? 'Loading...' : `${datasets.length} datasets in warehouse`}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && (
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <Database size={16} className={styles.statIcon} />
            <div>
              <span className={styles.statValue}>{datasets.length}</span>
              <span className={styles.statLabel}>Datasets</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <Table2 size={16} className={styles.statIcon} />
            <div>
              <span className={styles.statValue}>{totalRows.toLocaleString()}</span>
              <span className={styles.statLabel}>Total Rows</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <HardDrive size={16} className={styles.statIcon} />
            <div>
              <span className={styles.statValue}>{totalCols.toLocaleString()}</span>
              <span className={styles.statLabel}>Total Columns</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <Plug size={16} className={styles.statIcon} />
            <div>
              <span className={styles.statValue}>{connections.length}</span>
              <span className={styles.statLabel}>Connections</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
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
        <button className={styles.exportBtn} onClick={fetchData} disabled={loading}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Connections */}
      {connections.length > 0 && (
        <div className={styles.connectionsSection}>
          <h3 className={styles.sectionTitle}>Connected Sources</h3>
          <div className={styles.connectionsList}>
            {connections.map(c => (
              <div key={c.id} className={styles.connectionCard}>
                <Plug size={14} className={styles.connectionIcon} />
                <span className={styles.connectionName}>{c.name}</span>
                <span className={styles.connectionType}>{c.type}</span>
                <span className={`${styles.connectionStatus} ${c.status === 'active' ? styles.statusActive : ''}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Datasets Table */}
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span></span>
          <span>Dataset</span>
          <span>Rows</span>
          <span>Columns</span>
          <span>Source</span>
        </div>
        {filtered.map(d => (
          <div key={d.id}>
            <div className={styles.row} onClick={() => toggleExpand(d.id)}>
              <span className={styles.expandIcon}>
                {expandedId === d.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <div className={styles.fileCell}>
                <Database size={14} className={styles.fileIcon} />
                <span className={styles.fileName}>{d.name}</span>
              </div>
              <span className={styles.records}>{d.row_count?.toLocaleString() || '—'}</span>
              <span className={styles.colCount}>{d.column_count || '—'}</span>
              <span className={styles.sourceType}>
                <span className={styles.catTag}>{d.source_type || 'unknown'}</span>
              </span>
            </div>
            {expandedId === d.id && (
              <div className={styles.schemaPanel}>
                {schemaLoading === d.id ? (
                  <div className={styles.schemaLoading}>
                    <Loader2 size={14} className={styles.spin} /> Loading schema...
                  </div>
                ) : schemaMap[d.id] ? (
                  <div className={styles.schemaGrid}>
                    <div className={styles.schemaHeader}>
                      <span>Column</span>
                      <span>Type</span>
                    </div>
                    {schemaMap[d.id].map((col, i) => (
                      <div key={i} className={styles.schemaRow}>
                        <span className={styles.colName}>{col.name}</span>
                        <span className={styles.colType}>{col.type}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.schemaLoading}>No schema available</div>
                )}
              </div>
            )}
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
        <span>{filtered.length} of {datasets.length} datasets shown</span>
      </div>
    </div>
  )
}
