import { useEffect, useState } from 'react'
import { listPeriods } from '../api/periods'
import { getMonthlyResults } from '../api/results'

export default function MonthlyResults() {
  const [periods, setPeriods] = useState([])
  const [periodId, setPeriodId] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // Monthly results are looked up via any biweekly period in that month,
    // so we still pick from biweekly periods here.
    listPeriods('BIWEEKLY').then((res) => setPeriods(res.data))
  }, [])

  useEffect(() => {
    if (!periodId) return
    setError('')
    getMonthlyResults(periodId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load monthly results'))
  }, [periodId])

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Monthly Results</h1>

      <select style={styles.select} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
        <option value="">Select any period in the target month…</option>
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.start_date} – {p.end_date} (month {p.month}/{p.year})
          </option>
        ))}
      </select>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {data && !data.complete && (
        <p style={styles.incomplete}>{data.message}</p>
      )}

      {data && data.complete && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Rank</th>
              <th style={styles.th}>Candidate</th>
              <th style={styles.th}>Stream</th>
              <th style={styles.th}>Monthly TDC</th>
              <th style={styles.th}>Monthly Tech</th>
              <th style={styles.th}>Monthly Overall</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((r) => (
              <tr key={r.candidate_id}>
                <td style={styles.td}>{r.ranking}</td>
                <td style={styles.td}>{r.candidate_name} ({r.candidate_code})</td>
                <td style={styles.td}>{r.stream_name}</td>
                <td style={styles.td}>{r.monthly_tdc_average}</td>
                <td style={styles.td}>{r.monthly_tech_average}</td>
                <td style={styles.td}><strong>{r.monthly_overall_average}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const styles = {
  select: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: '1.5rem', width: 340 },
  incomplete: { background: '#fffbeb', color: '#92400e', padding: '0.75rem 1rem', borderRadius: 6, maxWidth: 480 },
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
