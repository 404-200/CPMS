import { useEffect, useState } from 'react'
import { getDashboardStreams, getDashboardSummary } from '../api/dashboard'
import RankingCard from '../components/RankingCard'
import StreamChart from '../components/StreamChart'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [streamAverages, setStreamAverages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getDashboardSummary(), getDashboardStreams()])
      .then(([summaryRes, streamsRes]) => {
        setSummary(summaryRes.data)
        setStreamAverages(streamsRes.data.stream_averages)
      })
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading dashboard…</p>
  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>

      <div style={styles.cardsRow}>
        <SummaryCard label="Total Candidates" value={summary.total_candidates} />
        <SummaryCard label="Total Streams" value={summary.total_streams} />
        <SummaryCard
          label="Current Period"
          value={
            summary.current_period
              ? `${summary.current_period.start_date} – ${summary.current_period.end_date}`
              : 'No periods yet'
          }
        />
      </div>

      <div style={styles.rankingsRow}>
        <RankingCard title="Highest Performing" candidates={summary.highest_performing} accentColor="#059669" />
        <RankingCard title="Median" candidates={summary.median} accentColor="#f59e0b" />
        <RankingCard title="Lowest Performing" candidates={summary.lowest_performing} accentColor="#dc2626" />
      </div>

      <h2 style={styles.sectionTitle}>Stream Performance</h2>
      <StreamChart streamAverages={streamAverages} />
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  )
}

const styles = {
  cardsRow: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: '1rem 1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    minWidth: 180,
  },
  cardLabel: { fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase' },
  cardValue: { fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem' },
  rankingsRow: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  sectionTitle: { fontSize: '1.1rem' },
}
