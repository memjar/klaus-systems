import { useState } from 'react'
import { FileText, Search, Download } from 'lucide-react'
import styles from './Explorer.module.css'

interface Dataset {
  name: string
  records: number
  desc: string
  type: 'csv' | 'json'
  category: string
}

const DATASETS: Dataset[] = [
  { name: 'brand_health_tracker_Q4_2025.csv', records: 280, desc: 'Brand health metrics — NPS, awareness, loyalty across 15+ brands', type: 'csv', category: 'Brand Health' },
  { name: 'competitive_benchmark_by_generation.csv', records: 180, desc: 'Competitive positioning segmented by Gen Z, Millennial, Gen X, Boomer', type: 'csv', category: 'Competitive' },
  { name: 'competitive_benchmark_market_share.csv', records: 120, desc: 'Market share percentages by category and region', type: 'csv', category: 'Competitive' },
  { name: 'competitive_benchmark_overall.csv', records: 150, desc: 'Overall competitive benchmark scores and rankings', type: 'csv', category: 'Competitive' },
  { name: 'consumer_sentiment_survey_canada_jan2026.csv', records: 520, desc: 'Canadian consumer sentiment — Jan 2026 wave, 18 markets', type: 'csv', category: 'Sentiment' },
  { name: 'genz_lifestyle_segmentation.csv', records: 340, desc: 'Gen Z lifestyle segments, values, purchase triggers', type: 'csv', category: 'Segmentation' },
  { name: 'promotion_roi_analysis_2025.csv', records: 95, desc: 'Promotion effectiveness and ROI by channel and brand', type: 'csv', category: 'ROI' },
  { name: 'purchase_drivers_by_generation_Q4_2025.csv', records: 210, desc: 'Key purchase drivers ranked by generational cohort', type: 'csv', category: 'Drivers' },
  { name: 'say_do_gap_food_beverage.csv', records: 160, desc: 'Say-Do Gap analysis — stated vs actual purchase behavior', type: 'csv', category: 'Behavioral' },
  { name: 'sponsorship_property_scores.csv', records: 75, desc: 'Sponsorship property evaluation scores and ROI', type: 'csv', category: 'ROI' },
  { name: 'ad_pretest_results_campaign_A_B_C.json', records: 380, desc: 'Ad pre-test results for campaigns A, B, C — recall, persuasion, diagnostics', type: 'json', category: 'Advertising' },
]

const CATEGORIES = ['All', ...Array.from(new Set(DATASETS.map(d => d.category)))]

export default function Explorer({ apiUrl: _apiUrl }: { apiUrl: string }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  const filtered = DATASETS.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.desc.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || d.category === category
    return matchSearch && matchCat
  })

  const totalRecords = DATASETS.reduce((sum, d) => sum + d.records, 0)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Data Explorer</h1>
          <p>Browse and query {DATASETS.length} IMI research datasets — {totalRecords.toLocaleString()} total records</p>
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
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`${styles.catBtn} ${category === c ? styles.catActive : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Dataset</span>
          <span>Category</span>
          <span>Records</span>
          <span>Description</span>
        </div>
        {filtered.map(d => (
          <div key={d.name} className={styles.row}>
            <div className={styles.fileCell}>
              <FileText size={14} className={styles.fileIcon} />
              <span className={styles.fileName}>{d.name}</span>
            </div>
            <span className={styles.category}>
              <span className={styles.catTag}>{d.category}</span>
            </span>
            <span className={styles.records}>{d.records}</span>
            <span className={styles.desc}>{d.desc}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className={styles.noResults}>No datasets match your search.</div>
        )}
      </div>

      <div className={styles.footer}>
        <span>{filtered.length} of {DATASETS.length} datasets shown</span>
        <button className={styles.exportBtn}>
          <Download size={14} />
          Export Catalog
        </button>
      </div>
    </div>
  )
}
