import styles from './Explorer.module.css'

const DATASETS = [
  { name: 'brand_health_summary.csv', records: 280, desc: 'Brand health metrics across 15+ brands' },
  { name: 'brand_nps.csv', records: 45, desc: 'Net Promoter Scores by brand' },
  { name: 'competitive_benchmarks.csv', records: 180, desc: 'Competitive positioning data' },
  { name: 'consumer_sentiment.csv', records: 520, desc: 'Sentiment analysis results' },
  { name: 'genz_purchase_drivers.csv', records: 340, desc: 'Gen Z purchase behavior drivers' },
  { name: 'market_share.csv', records: 120, desc: 'Market share by category' },
  { name: 'media_consumption.csv', records: 210, desc: 'Media consumption patterns' },
  { name: 'product_satisfaction.csv', records: 160, desc: 'Product satisfaction scores' },
  { name: 'regional_performance.csv', records: 95, desc: 'Regional performance breakdowns' },
  { name: 'sponsorship_roi.csv', records: 75, desc: 'Sponsorship ROI analysis' },
  { name: 'trend_analysis.json', records: 380, desc: 'Historical trend data' },
]

export default function Explorer({ apiUrl: _apiUrl }: { apiUrl: string }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Data Explorer</h1>
        <p>Browse and query IMI research datasets</p>
      </div>
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Dataset</span>
          <span>Records</span>
          <span>Description</span>
        </div>
        {DATASETS.map(d => (
          <div key={d.name} className={styles.row}>
            <span className={styles.fileName}>{d.name}</span>
            <span className={styles.records}>{d.records}</span>
            <span className={styles.desc}>{d.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
