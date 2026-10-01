import { useEffect, useRef, useState } from 'react'
import {
  createCandidate,
  importCandidatesDocument,
  listCandidates,
  permanentlyDeleteCandidate,
  updateCandidate,
} from '../api/candidates'
import CandidateTable from '../components/CandidateTable'
import CohortSwitcher from '../components/CohortSwitcher'
import StreamSwitcher from '../components/StreamSwitcher'
import { useAuth } from '../context/AuthContext'
import { useCohorts } from '../context/CohortContext'
import { useStreams } from '../context/StreamContext'

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  cohort_id: '',
}

function apiMessage(err, fallback) {
  return typeof err.response?.data?.detail === 'string' ? err.response.data.detail : fallback
}

export default function Candidates() {
  const { user } = useAuth()
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role)
  const { cohorts, currentCohortId } = useCohorts()
  const { streams, currentStreamId, selectStream } = useStreams()

  // Lets the mentor pick which grouping she's currently browsing/managing by.
  // Cohort is the default since candidates start life under a cohort, before
  // the 2-month split into streams.
  const [groupBy, setGroupBy] = useState('cohort')

  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const [streamFilter, setStreamFilter] = useState('')
  const [cohortFilter, setCohortFilter] = useState('')

  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState('')

  function refresh(streamId = streamFilter, cohortId = cohortFilter) {
    setLoading(true)
    const params = {}
    if (groupBy === 'stream' && streamId) params.stream_id = Number(streamId)
    if (groupBy === 'cohort' && cohortId) params.cohort_id = Number(cohortId)
    listCandidates(params)
      .then((res) => setCandidates(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load candidates'))
      .finally(() => setLoading(false))
  }

  // Default each filter to the globally-selected stream/cohort, then let the user override it.
  useEffect(() => {
    if (currentStreamId && !streamFilter) setStreamFilter(currentStreamId)
    if (currentCohortId && !cohortFilter) setCohortFilter(currentCohortId)
    refresh(currentStreamId || streamFilter, currentCohortId || cohortFilter)
  }, [currentStreamId, currentCohortId, groupBy]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStreamFilterSelect(streamId) {
    setStreamFilter(streamId)
    refresh(streamId, cohortFilter)
  }

  function handleCohortFilterSelect(cohortId) {
    setCohortFilter(cohortId)
    refresh(streamFilter, cohortId)
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAdd(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await createCandidate({
        first_name: form.first_name,
        last_name: form.last_name,
        cohort_id: Number(form.cohort_id),
      })
      setForm(EMPTY_FORM)
      refresh()
    } catch (err) {
      setError(apiMessage(err, 'Could not add this candidate - check the values and try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  // Put one or many candidates into a stream. The table calls this for both
  // the per-row dropdown (one id) and the bulk "Apply" bar (several ids).
  async function handleAssignStreams(candidateIds, streamId) {
    setError('')
    try {
      await Promise.all(candidateIds.map((id) => updateCandidate(id, { stream_id: streamId })))
      refresh()
    } catch (err) {
      setError(apiMessage(err, 'Could not assign the stream — please try again.'))
    }
  }

  // The table has already asked "are you sure?" before calling this.
  async function handleDeactivate(candidate) {
    setError('')
    try {
      await updateCandidate(candidate.id, { active: false })
      refresh()
    } catch (err) {
      setError(apiMessage(err, 'Could not deactivate this candidate.'))
    }
  }

  // The table has already asked "are you sure?" before calling this.
  async function handleDelete(candidate) {
    setError('')
    try {
      await permanentlyDeleteCandidate(candidate.id)
      refresh()
    } catch (err) {
      setError(apiMessage(err, 'Could not delete this candidate.'))
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError('')
    setImportResult(null)
    try {
      const res = await importCandidatesDocument(file)
      setImportResult(res.data)
      if (res.data.rows_created > 0) refresh()
    } catch (err) {
      setImportError(err.response?.data?.detail || 'Could not import the file')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidates</h1>
          <p className="page-subtitle">Manage the people in each cohort or stream, or bring them in automatically from a file.</p>
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: '1rem', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: '0.85rem', marginRight: '0.25rem' }}>View by:</span>
        <button
          type="button"
          className={`btn-pill ${groupBy === 'cohort' ? 'active' : ''}`}
          onClick={() => setGroupBy('cohort')}
        >
          Cohort
        </button>
        <button
          type="button"
          className={`btn-pill ${groupBy === 'stream' ? 'active' : ''}`}
          onClick={() => setGroupBy('stream')}
        >
          Stream
        </button>
      </div>

      {groupBy === 'stream' && (
        <div className="form-row" style={{ marginBottom: '1.5rem' }}>
          <span className="muted" style={{ fontSize: '0.85rem', marginRight: '0.25rem' }}>Filter by stream:</span>
          <button
            type="button"
            className={`btn-pill ${streamFilter === '' ? 'active' : ''}`}
            onClick={() => handleStreamFilterSelect('')}
          >
            All
          </button>
          {streams.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`btn-pill ${String(streamFilter) === String(s.id) ? 'active' : ''}`}
              onClick={() => {
                handleStreamFilterSelect(String(s.id))
                selectStream(String(s.id))
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {groupBy === 'cohort' && (
        <div className="form-row" style={{ marginBottom: '1.5rem' }}>
          <span className="muted" style={{ fontSize: '0.85rem', marginRight: '0.25rem' }}>Filter by cohort:</span>
          <button
            type="button"
            className={`btn-pill ${cohortFilter === '' ? 'active' : ''}`}
            onClick={() => handleCohortFilterSelect('')}
          >
            All
          </button>
          {cohorts.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`btn-pill ${String(cohortFilter) === String(c.id) ? 'active' : ''}`}
              onClick={() => handleCohortFilterSelect(String(c.id))}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="form-row switcher-on-light" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
        <div>
          <div className="muted" style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>Cohort</div>
          <CohortSwitcher />
        </div>
        <div>
          <div className="muted" style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>Stream</div>
          <StreamSwitcher />
        </div>
      </div>

      {canManage && (
        <div className="dropzone" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Import candidates from a file</div>
          <div className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.6rem' }}>
            Upload a .xlsx, .csv, or .pdf with columns: Candidate ID, First Name, Last Name, Cohort (Email
            optional). Any row error rejects the whole file - nothing partial is saved.
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv,.pdf"
            onChange={handleImportFile}
            disabled={importing}
          />
          {importing && <p className="muted">Importing…</p>}
          {importError && <p className="alert alert-danger" style={{ marginTop: '0.6rem' }}>{importError}</p>}
          {importResult && (
            <div style={{ marginTop: '0.6rem' }}>
              {importResult.rows_created > 0 ? (
                <p className="alert alert-success">
                  Imported {importResult.rows_created} candidate(s) from {importResult.filename}.
                </p>
              ) : (
                <p className="alert alert-danger">
                  Import rejected — {importResult.errors.length} row error(s), nothing was saved.
                </p>
              )}
              {importResult.errors.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  {importResult.errors.map((e, i) => (
                    <li key={i} style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {canManage && (
        <form onSubmit={handleAdd} className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid">
            <input
              className="input"
              placeholder="First name"
              value={form.first_name}
              onChange={(e) => updateForm('first_name', e.target.value)}
              required
            />
            <input
              className="input"
              placeholder="Last name"
              value={form.last_name}
              onChange={(e) => updateForm('last_name', e.target.value)}
              required
            />
            <select
              className="input"
              value={form.cohort_id}
              onChange={(e) => updateForm('cohort_id', e.target.value)}
              required
            >
              <option value="">Cohort…</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
                                                            <button
            className="btn btn-primary"
            type="submit"
            style={{ width: 'fit-content' }}
            disabled={submitting || cohorts.length === 0}
          >
            {submitting ? 'Adding…' : 'Add candidate'}
          </button>
          {cohorts.length === 0 && (
            <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
              Create a cohort first (use the Cohort switcher above) before adding candidates.
            </p>
          )}
        </form>
      )}

      {error && <p className="alert alert-danger">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <CandidateTable
          candidates={candidates}
          streams={streams}
          onAssignStreams={canManage ? handleAssignStreams : undefined}
          onDeactivate={canManage ? handleDeactivate : undefined}
          onDelete={canManage ? handleDelete : undefined}
        />
      )}
    </div>
  )
}