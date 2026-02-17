import { useState, useEffect } from 'react'
import { TrendingUp, Users, BarChart3, Brain, Activity, Globe } from 'lucide-react'
import styles from './Dashboard.module.css'

interface BrandMetric {
  brand: string
  nps: number
  awareness: number
  loyalty: number
  change: number
}

const STATIC_BRANDS: BrandMetric[] = [
  { brand: 'Brand A (Leader)', nps: 47, awareness: 67, loyalty: 72, change: 5 },
  { brand: 'Brand D (Challenger)', nps: 52, awareness: 41, loyalty: 58, change: 8 },
  { brand: 'Brand B', nps: 38, awareness: 54, loyalty: 65, change: -3 },
  { brand: 'Brand C', nps: 29, awareness: 28, loyalty: 44, change: 4 },
  { brand: 'Brand E', nps: 18, awareness: 19, loyalty: 31, change: -4 },
]

const DATASETS = [
  'brand_health_tracker_Q4_2025.csv',
  'competitive_benchmark_by_generation.csv',
  'competitive_benchmark_market_share.csv',
  'competitive_benchmark_overall.csv',
  'consumer_sentiment_survey_canada_jan2026.csv',
  'genz_lifestyle_segmentation.csv',
  'promotion_roi_analysis_2025.csv',
  'purchase_drivers_by_generation_Q4_2025.csv',
  'say_do_gap_food_beverage.csv',
  'sponsorship_property_scores.csv',
  'ad_pretest_results_campaign_A_B_C.json',
]

export default function Dashboard({ apiUrl: _apiUrl }: { apiUrl: string }) {
  const [brands] = useState<BrandMetric[]>(STATIC_BRANDS)
  const [activeTab, setActiveTab] = useState<'overview' | 'nps' | 'competitive'>('overview')

  useEffect(() => {
    // Future: fetch live metrics from /klaus/imi/dashboard
  }, [])

  const maxNps = Math.max(...brands.map(b => b.nps))

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Research Dashboard</h1>
          <p>IMI brand health metrics and consumer insights</p>
        </div>
        <div className={styles.tabs}>
          {(['overview', 'nps', 'competitive'] as const).map(tab => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' ? 'Overview' : tab === 'nps' ? 'NPS Tracker' : 'Competitive'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <BarChart3 size={20} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>11</span>
            <span className={styles.statLabel}>Datasets</span>
          </div>
        </div>
        <div className={styles.stat}>
          <Users size={20} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>2,405</span>
            <span className={styles.statLabel}>Records</span>
          </div>
        </div>
        <div className={styles.stat}>
          <TrendingUp size={20} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>15+</span>
            <span className={styles.statLabel}>Brands</span>
          </div>
        </div>
        <div className={styles.stat}>
          <Brain size={20} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>Qwen 32B</span>
            <span className={styles.statLabel}>Model</span>
          </div>
        </div>
        <div className={styles.stat}>
          <Globe size={20} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>18</span>
            <span className={styles.statLabel}>Countries</span>
          </div>
        </div>
        <div className={styles.stat}>
          <Activity size={20} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>55+</span>
            <span className={styles.statLabel}>Years Data</span>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className={styles.section}>
            <h2>NPS Performance — Q4 2025</h2>
            <div className={styles.npsChart}>
              {brands.map(b => (
                <div key={b.brand} className={styles.npsRow}>
                  <span className={styles.npsLabel}>{b.brand}</span>
                  <div className={styles.npsBarWrap}>
                    <div
                      className={styles.npsBar}
                      style={{ width: `${(b.nps / maxNps) * 100}%` }}
                    />
                    <span className={styles.npsValue}>+{b.nps}</span>
                  </div>
                  <span className={`${styles.npsChange} ${b.change >= 0 ? styles.up : styles.down}`}>
                    {b.change >= 0 ? '+' : ''}{b.change}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h2>Loaded Datasets</h2>
            <div className={styles.datasetGrid}>
              {DATASETS.map(d => (
                <div key={d} className={styles.dataset}>
                  <span className={styles.datasetIcon}>{d.endsWith('.json') ? '{ }' : 'CSV'}</span>
                  <span className={styles.datasetName}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'nps' && (
        <div className={styles.section}>
          <h2>Net Promoter Score Tracker</h2>
          <div className={styles.npsTable}>
            <div className={styles.tableHead}>
              <span>Brand</span>
              <span>NPS</span>
              <span>Awareness</span>
              <span>Loyalty</span>
              <span>Q/Q Change</span>
            </div>
            {brands.map(b => (
              <div key={b.brand} className={styles.tableRow}>
                <span className={styles.brandName}>{b.brand}</span>
                <span className={styles.npsCell}>+{b.nps}</span>
                <span>{b.awareness}%</span>
                <span>{b.loyalty}%</span>
                <span className={`${styles.changeCell} ${b.change >= 0 ? styles.up : styles.down}`}>
                  {b.change >= 0 ? '+' : ''}{b.change}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.insight}>
            <strong>Key Insight:</strong> Brand D's NPS surge of +8 points is the largest single-quarter gain in the tracker's history. Exit interviews attribute this to their Q3 sustainability campaign.
          </div>
        </div>
      )}

      {activeTab === 'competitive' && (
        <div className={styles.section}>
          <h2>Competitive Landscape</h2>
          <div className={styles.compGrid}>
            <div className={styles.compCard}>
              <h3>Market Leaders</h3>
              <p>Brand A maintains dominance with 67% unaided awareness, but Brand D is closing the gap fastest (+9pp Q/Q).</p>
            </div>
            <div className={styles.compCard}>
              <h3>Gen Z Disruption</h3>
              <p>Digital-native brands are eroding legacy brand equity. Gen Z loyalty patterns are fundamentally reshaping the competitive landscape.</p>
            </div>
            <div className={styles.compCard}>
              <h3>Sustainability Impact</h3>
              <p>Sustainability messaging now directly correlates with NPS improvement. The Say-Do Gap is closing for brands that follow through.</p>
            </div>
            <div className={styles.compCard}>
              <h3>Regional Variance</h3>
              <p>Western Canada shows 12% higher brand switching than Eastern Canada. Quebec maintains unique brand loyalty patterns.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
