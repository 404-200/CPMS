import { useEffect, useState } from 'react'
import { createCandidate, deleteCandidate, listCandidates, listStreams } from '../api/candidates'
import CandidateTable from '../components/CandidateTable'
import { useAuth } from '../context/AuthContext'

export default function Candidates() {
  const { user } = useAuth()
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role)

  const [candidates, setCandidates] = useState([])
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ candidate_code: '', first_name: '', last_name: '', stream_id: '' })
  const [submitting, setSubmitting] = useState(false)

  function refresh() {
    setLoading(true)
    Promise.all([listCandidates(), listStreams()])
      .then(([cRes, sRes]) => {
        setCandidates(cRes.data)
        setStreams(sRes.data)
      })
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load candidates'))
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [])

  async function handleAdd(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await createCandidate({ ...form, stream_id: Number(form.stream_id) })
      setForm({ candidate_code: '', first_name: '', last_name: '', stream_id: '' })
      refresh()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not add candidate')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(candidate) {
    await deleteCandidate(candidate.id)
    refresh()
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Candidates</h1>

      {canManage && (
        <form onSubmit={handleAdd} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Candidate ID"
            value={form.candidate_code}
            onChange={(e) => setForm({ ...form, candidate_code: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="First name"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="Last name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            required
          />
          <select
            style={styles.input}
            value={form.stream_id}
            onChange={(e) => setForm({ ...form, stream_id: e.target.value })}
            required
          >
            <option value="">Stream…</option>
            {streams.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button style={styles.button} type="submit" disabled={submitting}>
            Add candidate
          </button>
        </form>
      )}

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <CandidateTable candidates={candidates} onDeactivate={canManage ? handleDeactivate : undefined} />
      )}
    </div>
  )
}

const styles = {
  form: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6 },
  button: {
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '0.55rem 1rem',
    cursor: 'pointer',
  },
}
