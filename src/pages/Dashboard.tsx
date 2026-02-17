import styles from './Dashboard.module.css'

export default function Dashboard({ apiUrl }: { apiUrl: string }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Research Dashboard</h1>
        <p>IMI brand health metrics and consumer insights</p>
      </div>
      <div className={styles.grid}>
        {[
          { label: 'Datasets Loaded', value: '11', sub: 'CSV/JSON sources' },
          { label: 'Total Records', value: '2.4K+', sub: 'across all datasets' },
          { label: 'Brands Tracked', value: '15+', sub: 'with NPS scores' },
          { label: 'Model', value: 'Qwen 32B', sub: 'IMI fine-tuned' },
        ].map(card => (
          <div key={card.label} className={styles.card}>
            <span className={styles.cardValue}>{card.value}</span>
            <span className={styles.cardLabel}>{card.label}</span>
            <span className={styles.cardSub}>{card.sub}</span>
          </div>
        ))}
      </div>
      <div className={styles.placeholder}>
        <p>Dashboard visualizations will render here once the backend pipeline is connected at <code>{apiUrl}/imi/dashboard</code></p>
      </div>
    </div>
  )
}
