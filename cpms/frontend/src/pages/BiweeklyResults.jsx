import { useEffect, useState } from 'react'
import { listPeriods } from '../api/periods'
import { getBiweeklyResults } from '../api/results'
import StreamChart from '../components/StreamChart'
import RankingCard from '../components/RankingCard'

export default function BiweeklyResults() {
  const [periods, setPeriods] = useState([])
  const [periodId, setPeriodId] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listPeriods('BIWEEKLY').then((res) => setPeriods(res.data))
  }, [])

  useEffect(() => {
    if (!periodId) return
    setError('')
    getBiweeklyResults(periodId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load results'))
  }, [periodId])

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Biweekly Results</h1>

      <select style={styles.select} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
        <option value="">Select a period…</option>
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.start_date} – {p.end_date}
          </option>
        ))}
      </select>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {data && (
        <>
          <div style={styles.rankingsRow}>
            <RankingCard title="Highest" candidates={data.ranking_summary.highest} accentColor="#059669" />
            <RankingCard title={`Median (${data.ranking_summary.median_value})`} candidates={data.ranking_summary.median} accentColor="#f59e0b" />
            <RankingCard title="Lowest" candidates={data.ranking_summary.lowest} accentColor="#dc2626" />
          </div>

          <h2 style={styles.sectionTitle}>Stream Averages</h2>
          <StreamChart streamAverages={data.stream_averages} />

          <h2 style={styles.sectionTitle}>All Candidates</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Stream</th>
                <th style={styles.th}>TDC</th>
                <th style={styles.th}>Tech</th>
                <th style={styles.th}>Overall</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r) => (
                <tr key={r.candidate_id}>
                  <td style={styles.td}>{r.ranking}</td>
                  <td style={styles.td}>{r.candidate_name} ({r.candidate_code})</td>
                  <td style={styles.td}>{r.stream_name}</td>
                  <td style={styles.td}>{r.tdc_average}</td>
                  <td style={styles.td}>{r.tech_average}</td>
                  <td style={styles.td}><strong>{r.overall_average}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

const styles = {
  select: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: '1.5rem' },
  rankingsRow: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  sectionTitle: { fontSize: '1.1rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', marginTop: '0.5rem' },
  th: {
    textAlign: 'left',
    padding: '0.6rem 0.75rem',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '0.8rem',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  td: { padding: '0.6rem 0.75rem', borderBottom: '1px solid #f0f1f3', fontSize: '0.9rem' },
}
