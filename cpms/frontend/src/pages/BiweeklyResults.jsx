import { useEffect, useState } from 'react'
import { listPeriods } from '../api/periods'
import { getBiweeklyResults } from '../api/results'
import RankingCard from '../components/RankingCard'
import StreamChart from '../components/StreamChart'

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
      <div className="page-header">
        <div>
          <h1 className="page-title">Biweekly Results</h1>
          <p className="page-subtitle">Rankings and stream averages for a chosen biweekly period.</p>
        </div>
      </div>

      <select className="input" style={{ marginBottom: '1.5rem', width: 320 }} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
        <option value="">Select a period…</option>
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.start_date} – {p.end_date}
          </option>
        ))}
      </select>

      {error && <p className="alert alert-danger">{error}</p>}

      {data && (
        <>
          <div className="card-grid">
            <RankingCard title="Highest" candidates={data.ranking_summary.highest} accentColor="var(--color-success)" />
            <RankingCard title={`Median (${data.ranking_summary.median_value})`} candidates={data.ranking_summary.median} accentColor="var(--color-warning)" />
            <RankingCard title="Lowest" candidates={data.ranking_summary.lowest} accentColor="var(--color-danger)" />
          </div>

          <h2 className="section-title">Stream Averages</h2>
          <StreamChart streamAverages={data.stream_averages} />

          <h2 className="section-title">All Candidates</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Candidate</th>
                  <th>Stream</th>
                  <th>TDC</th>
                  <th>Tech</th>
                  <th>Overall</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.candidate_id}>
                    <td>{r.ranking}</td>
                    <td>{r.candidate_name} ({r.candidate_code})</td>
                    <td>{r.stream_name}</td>
                    <td>{r.tdc_average}</td>
                    <td>{r.tech_average}</td>
                    <td><strong>{r.overall_average}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
