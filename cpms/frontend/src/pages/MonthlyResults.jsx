import { useEffect, useState } from 'react'
import { listPeriods } from '../api/periods'
import { getMonthlyResults } from '../api/results'

export default function MonthlyResults() {
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
    getMonthlyResults(periodId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load monthly results'))
  }, [periodId])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Results</h1>
          <p className="page-subtitle">Averaged across both biweekly periods in the month.</p>
        </div>
      </div>

      <select className="input" style={{ marginBottom: '1.5rem', width: 360 }} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
        <option value="">Select any period in the target month…</option>
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.start_date} – {p.end_date} (month {p.month}/{p.year})
          </option>
        ))}
      </select>

      {error && <p className="alert alert-danger">{error}</p>}

      {data && !data.complete && <p className="alert alert-warning">{data.message}</p>}

      {data && data.complete && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Stream</th>
                <th>Monthly TDC</th>
                <th>Monthly Tech</th>
                <th>Monthly Overall</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r) => (
                <tr key={r.candidate_id}>
                  <td>{r.ranking}</td>
                  <td>{r.candidate_name} ({r.candidate_code})</td>
                  <td>{r.stream_name}</td>
                  <td>{r.monthly_tdc_average}</td>
                  <td>{r.monthly_tech_average}</td>
                  <td><strong>{r.monthly_overall_average}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
