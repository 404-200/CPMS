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
    <form onSubmit={handleSubmit} style={styles.form}>
      <label style={styles.label}>
        Biweekly period
        <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} style={styles.input} required>
          <option value="">Select a period…</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.start_date} – {p.end_date}
            </option>
          ))}
        </select>
      </label>

      <label style={styles.label}>
        Score sheet (.xlsx)
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files[0])}
          style={styles.input}
          required
        />
      </label>

      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={createNewVersion}
          onChange={(e) => setCreateNewVersion(e.target.checked)}
        />
        Replace existing version for this period (Admin only)
      </label>

      <button type="submit" style={styles.button} disabled={submitting}>
        {submitting ? 'Uploading…' : 'Upload'}
      </button>

      {result && (
        <div style={result.status === 'SUCCESS' ? styles.success : styles.error}>
          <strong>{result.status}</strong> — {result.rows_processed} of {result.rows_received} row(s) processed.
          {result.errors && result.errors.length > 0 && (
            <ul>
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

const styles = {
  form: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 420 },
  label: { display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' },
  input: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6 },
  button: {
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '0.6rem 1rem',
    cursor: 'pointer',
    width: 'fit-content',
  },
  success: { background: '#ecfdf5', color: '#065f46', padding: '0.75rem', borderRadius: 6, fontSize: '0.85rem' },
  error: { background: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: 6, fontSize: '0.85rem' },
}
