import { useEffect, useState } from 'react'
import { getDashboardStreams, getDashboardSummary } from '../api/dashboard'
import RankingCard from '../components/RankingCard'
import StreamChart from '../components/StreamChart'
import { useStreams } from '../context/StreamContext'

export default function Dashboard() {
  const { currentStream } = useStreams()
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

  if (loading) return <p className="muted">Loading dashboard…</p>
  if (error) return <p className="alert alert-danger">{error}</p>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {currentStream ? `Currently working on the ${currentStream.name} stream.` : 'An overview across all streams.'}
          </p>
        </div>
      </div>

      <div className="card-grid">
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

      <div className="card-grid">
        <RankingCard title="Highest Performing" candidates={summary.highest_performing} accentColor="var(--color-success)" />
        <RankingCard title="Median" candidates={summary.median} accentColor="var(--color-warning)" />
        <RankingCard title="Lowest Performing" candidates={summary.lowest_performing} accentColor="var(--color-danger)" />
      </div>

      <h2 className="section-title">Stream Performance</h2>
      <StreamChart streamAverages={streamAverages} />
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}
