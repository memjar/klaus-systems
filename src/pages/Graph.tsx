import { useState, useEffect, useCallback } from 'react'
import { Network, Search, Loader2, RefreshCw } from 'lucide-react'
import styles from './Graph.module.css'

interface GraphNode {
  id: string
  label: string
  type: string
  properties: Record<string, unknown>
}

interface GraphEdge {
  source: string
  target: string
  relationship: string
}

const TYPE_COLORS: Record<string, string> = {
  Brand: 'var(--green)',
  Segment: '#60a5fa',
  Concept: '#f59e0b',
  Study: '#a78bfa',
  Metric: '#f472b6',
}

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || 'var(--text-muted)'
}

export default function Graph({ apiUrl }: { apiUrl: string }) {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedNode, setExpandedNode] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<string | null>(null)
  const [empty, setEmpty] = useState(false)

  const headers = { 'ngrok-skip-browser-warning': 'true' }

  const fetchGraph = useCallback(async () => {
    setLoading(true)
    setEmpty(false)
    try {
      const [nodesRes, edgesRes] = await Promise.all([
        fetch(`${apiUrl}/klaus/imi/graph/nodes`, { headers }),
        fetch(`${apiUrl}/klaus/imi/graph/edges`, { headers }),
      ])
      if (!nodesRes.ok || !edgesRes.ok) {
        setEmpty(true)
        setNodes([])
        setEdges([])
        return
      }
      const nodesData = await nodesRes.json()
      const edgesData = await edgesRes.json()
      const n = nodesData.nodes || []
      const e = edgesData.edges || []
      setNodes(n)
      setEdges(e)
      if (n.length === 0) setEmpty(true)
    } catch {
      setEmpty(true)
      setNodes([])
      setEdges([])
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  const searchNodes = useCallback(async (q: string) => {
    if (!q.trim()) {
      fetchGraph()
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/klaus/imi/graph/search?q=${encodeURIComponent(q)}`, { headers })
      if (!res.ok) {
        setEmpty(true)
        setNodes([])
        return
      }
      const data = await res.json()
      setNodes(data.nodes || [])
    } catch {
      setEmpty(true)
      setNodes([])
    } finally {
      setLoading(false)
    }
  }, [apiUrl, fetchGraph])

  useEffect(() => { fetchGraph() }, [fetchGraph])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchNodes(search)
  }

  const connectionCount = (nodeId: string) =>
    edges.filter(e => e.source === nodeId || e.target === nodeId).length

  const getConnections = (nodeId: string) =>
    edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => {
        const otherId = e.source === nodeId ? e.target : e.source
        const other = nodes.find(n => n.id === otherId)
        return { node: other, relationship: e.relationship, direction: e.source === nodeId ? 'out' : 'in' }
      })
      .filter(c => c.node)

  const nodeTypes = Array.from(new Set(nodes.map(n => n.type))).sort()

  const filtered = nodes.filter(n => {
    if (activeType && n.type !== activeType) return false
    return true
  })

  const typeBreakdown = nodeTypes.map(t => ({
    type: t,
    count: nodes.filter(n => n.type === t).length,
  }))

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1><Network size={20} /> Knowledge Graph</h1>
        <p>Explore entity relationships across datasets</p>
      </div>

      {/* Stats bar */}
      {!loading && !empty && (
        <div className={styles.stats}>
          <span className={styles.stat}>{nodes.length} nodes</span>
          <span className={styles.stat}>{edges.length} edges</span>
          {typeBreakdown.map(tb => (
            <span key={tb.type} className={styles.stat} style={{ borderColor: getTypeColor(tb.type) }}>
              {tb.type}: {tb.count}
            </span>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        <form onSubmit={handleSearch} className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.search}
            placeholder="Search nodes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </form>
        <button className={styles.btn} onClick={fetchGraph} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Type filters */}
      {nodeTypes.length > 0 && (
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${!activeType ? styles.filterActive : ''}`}
            onClick={() => setActiveType(null)}
          >
            All
          </button>
          {nodeTypes.map(t => (
            <button
              key={t}
              className={`${styles.filterBtn} ${activeType === t ? styles.filterActive : ''}`}
              style={{ '--type-color': getTypeColor(t) } as React.CSSProperties}
              onClick={() => setActiveType(activeType === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className={styles.center}>
          <Loader2 size={24} className={styles.spin} />
          <p>Loading graph...</p>
        </div>
      ) : empty ? (
        <div className={styles.center}>
          <Network size={40} style={{ opacity: 0.3 }} />
          <p className={styles.placeholder}>Knowledge graph will populate as you query datasets</p>
        </div>
      ) : (
        <div className={styles.nodeList}>
          {filtered.map(node => {
            const conns = connectionCount(node.id)
            const isExpanded = expandedNode === node.id
            const connections = isExpanded ? getConnections(node.id) : []
            return (
              <div key={node.id} className={styles.nodeCard} onClick={() => setExpandedNode(isExpanded ? null : node.id)}>
                <div className={styles.nodeHeader}>
                  <span className={styles.nodeLabel}>{node.label}</span>
                  <span className={styles.nodeType} style={{ background: getTypeColor(node.type) }}>
                    {node.type}
                  </span>
                  <span className={styles.connCount}>{conns} connection{conns !== 1 ? 's' : ''}</span>
                </div>
                {isExpanded && connections.length > 0 && (
                  <div className={styles.connections}>
                    {connections.map((c, i) => (
                      <div key={i} className={styles.connection}>
                        <span className={styles.relLabel}>
                          {c.direction === 'out' ? '→' : '←'} {c.relationship}
                        </span>
                        <span className={styles.connNode}>
                          <span className={styles.connDot} style={{ background: getTypeColor(c.node!.type) }} />
                          {c.node!.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {isExpanded && connections.length === 0 && (
                  <div className={styles.connections}>
                    <span className={styles.noConn}>No connections</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
