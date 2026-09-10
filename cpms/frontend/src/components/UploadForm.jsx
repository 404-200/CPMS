import { useState } from 'react'

export default function UploadForm({ periods, onSubmit, submitting, result }) {
  const [periodId, setPeriodId] = useState('')
  const [file, setFile] = useState(null)
  const [createNewVersion, setCreateNewVersion] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!periodId || !file) return
    onSubmit(file, periodId, createNewVersion)
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 460 }}>
      <label className="field">
        Biweekly period
        <select className="input" value={periodId} onChange={(e) => setPeriodId(e.target.value)} required>
          <option value="">Select a period…</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.start_date} – {p.end_date}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Score sheet (.xlsx)
        <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files[0])} className="input" required />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 400 }}>
        <input type="checkbox" checked={createNewVersion} onChange={(e) => setCreateNewVersion(e.target.checked)} />
        Replace existing version for this period (Admin only)
      </label>

      <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }} disabled={submitting}>
        {submitting ? 'Uploading…' : 'Upload'}
      </button>

      {result && (
        <div className={result.status === 'SUCCESS' ? 'alert alert-success' : 'alert alert-danger'} style={{ margin: 0 }}>
          <strong>{result.status}</strong> — {result.rows_processed} of {result.rows_received} row(s) processed.
          {result.errors && result.errors.length > 0 && (
            <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem' }}>
              {result.errors.map((err, i) => (
                <li key={i}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}
