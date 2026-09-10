import { useEffect, useRef, useState } from 'react'
import {
  createCandidate,
  deleteCandidate,
  importCandidatesDocument,
  listCandidates,
} from '../api/candidates'
import { createPeriod, listPeriods } from '../api/periods'
import { submitManualScore } from '../api/scores'
import CandidateTable from '../components/CandidateTable'
import { useAuth } from '../context/AuthContext'
import { useStreams } from '../context/StreamContext'

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  stream_id: '',
  attendance: '',
  communication: '',
  accountability: '',
  creativity: '',
  project_delivery: '',
  tech_skills: '',
  dev_group_name: '',
  weekly_feedback: '',
  action_plan: '',
}

export default function Candidates() {
  const { user } = useAuth()
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role)
  const { streams, currentStreamId, selectStream } = useStreams()

  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const [streamFilter, setStreamFilter] = useState('')
  const [periods, setPeriods] = useState([])
  const [periodFilter, setPeriodFilter] = useState('')

  const [showPeriodForm, setShowPeriodForm] = useState(false)
  const [periodForm, setPeriodForm] = useState({
    period_type: 'BIWEEKLY',
    start_date: '',
    end_date: '',
    month: '',
    year: '',
  })
  const [periodSubmitting, setPeriodSubmitting] = useState(false)
  const [periodError, setPeriodError] = useState('')

  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState('')

  function refresh(currentStreamFilter = streamFilter, currentPeriodFilter = periodFilter) {
    setLoading(true)
    const params = {}
    if (currentStreamFilter) params.stream_id = Number(currentStreamFilter)
    if (currentPeriodFilter) params.period_id = Number(currentPeriodFilter)
    listCandidates(params)
      .then((res) => setCandidates(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load candidates'))
      .finally(() => setLoading(false))
  }

  // Load available periods once, default to the most recent one.
  useEffect(() => {
    listPeriods().then((res) => {
      setPeriods(res.data)
      if (res.data.length) {
        const latest = res.data[res.data.length - 1]
        setPeriodFilter(String(latest.id))
        refresh(streamFilter, String(latest.id))
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Default the filter to the globally-selected stream, then let the user override it.
  useEffect(() => {
    if (currentStreamId && !streamFilter) {
      setStreamFilter(currentStreamId)
      refresh(currentStreamId)
    } else {
      refresh()
    }
  }, [currentStreamId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilterSelect(streamId) {
    setStreamFilter(streamId)
    refresh(streamId)
  }

  function handlePeriodSelect(periodId) {
    setPeriodFilter(periodId)
    refresh(streamFilter, periodId)
  }

  function updatePeriodForm(field, value) {
    setPeriodForm((prev) => {
      const next = { ...prev, [field]: value }
      // Auto-fill month/year from the start date, since that's what the form usually is.
      if (field === 'start_date' && value) {
        const d = new Date(value)
        next.month = String(d.getMonth() + 1)
        next.year = String(d.getFullYear())
      }
      return next
    })
  }

  async function handleCreatePeriod(e) {
    e.preventDefault()
    setPeriodSubmitting(true)
    setPeriodError('')
    try {
      const res = await createPeriod({
        period_type: periodForm.period_type,
        start_date: periodForm.start_date,
        end_date: periodForm.end_date,
        month: Number(periodForm.month),
        year: Number(periodForm.year),
      })
      const updated = await listPeriods()
      setPeriods(updated.data)
      setPeriodFilter(String(res.data.id))
      refresh(streamFilter, String(res.data.id))
      setPeriodForm({ period_type: 'BIWEEKLY', start_date: '', end_date: '', month: '', year: '' })
      setShowPeriodForm(false)
    } catch (err) {
      setPeriodError(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Could not create this period — check the dates and try again.'
      )
    } finally {
      setPeriodSubmitting(false)
    }
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!periodFilter) {
      setError('Select a period above before adding a candidate with scores.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const candidateRes = await createCandidate({
        first_name: form.first_name,
        last_name: form.last_name,
        stream_id: Number(form.stream_id),
      })
      const newCandidateId = candidateRes.data.id

      await submitManualScore({
        candidate_id: newCandidateId,
        period_id: Number(periodFilter),
        attendance: Number(form.attendance),
        communication: Number(form.communication),
        accountability: Number(form.accountability),
        creativity: Number(form.creativity),
        project_delivery: Number(form.project_delivery),
        tech_skills: Number(form.tech_skills),
        dev_group_name: form.dev_group_name || null,
        weekly_feedback: form.weekly_feedback || null,
        action_plan: form.action_plan || null,
        commitment_type: 'INDIVIDUAL',
      })

      setForm(EMPTY_FORM)
      refresh()
    } catch (err) {
      setError(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Could not add this candidate — check the values and try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(candidate) {
    await deleteCandidate(candidate.id)
    refresh()
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
          <p className="page-subtitle">Manage the people in each stream, or bring them in automatically from a file.</p>
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: '1.5rem' }}>
        <span className="muted" style={{ fontSize: '0.85rem', marginRight: '0.25rem' }}>Filter by stream:</span>
        <button
          type="button"
          className={`btn-pill ${streamFilter === '' ? 'active' : ''}`}
          onClick={() => handleFilterSelect('')}
        >
          All
        </button>
        {streams.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`btn-pill ${String(streamFilter) === String(s.id) ? 'active' : ''}`}
            onClick={() => {
              handleFilterSelect(String(s.id))
              selectStream(String(s.id))
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="form-row" style={{ marginBottom: '0.5rem', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: '0.85rem', marginRight: '0.25rem' }}>Period:</span>
        <select
          className="input"
          value={periodFilter}
          onChange={(e) => handlePeriodSelect(e.target.value)}
        >
          <option value="">Select a period…</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.period_type} {p.start_date} – {p.end_date}
            </option>
          ))}
        </select>
        {canManage && (
          <button
            type="button"
            className="btn-link"
            style={{ marginLeft: '0.75rem' }}
            onClick={() => setShowPeriodForm((v) => !v)}
          >
            {showPeriodForm ? 'Cancel' : '+ New period'}
          </button>
        )}
      </div>

      {canManage && showPeriodForm && (
        <form
          onSubmit={handleCreatePeriod}
          className="card"
          style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 560 }}
        >
          <div className="form-grid">
            <select
              className="input"
              value={periodForm.period_type}
              onChange={(e) => updatePeriodForm('period_type', e.target.value)}
              required
            >
              <option value="BIWEEKLY">Biweekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            <label className="field" style={{ fontSize: '0.8rem' }}>
              Start date
              <input
                className="input"
                type="date"
                value={periodForm.start_date}
                onChange={(e) => updatePeriodForm('start_date', e.target.value)}
                required
              />
            </label>
            <label className="field" style={{ fontSize: '0.8rem' }}>
              End date
              <input
                className="input"
                type="date"
                value={periodForm.end_date}
                onChange={(e) => updatePeriodForm('end_date', e.target.value)}
                required
              />
            </label>
          </div>
          <div className="muted" style={{ fontSize: '0.78rem' }}>
            Month/year are set automatically from the start date ({periodForm.month || '—'}/{periodForm.year || '—'}).
          </div>
          {periodError && <p className="alert alert-danger" style={{ margin: 0 }}>{periodError}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: 'fit-content' }}
            disabled={periodSubmitting}
          >
            {periodSubmitting ? 'Creating…' : 'Create period'}
          </button>
        </form>
      )}

      {canManage && (
        <div className="dropzone" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Import candidates from a file</div>
          <div className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.6rem' }}>
            Upload a .xlsx, .csv, or .pdf with columns: Candidate ID, First Name, Last Name, Stream (Email
            optional). Any row error rejects the whole file — nothing partial is saved.
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
              value={form.stream_id}
              onChange={(e) => updateForm('stream_id', e.target.value)}
              required
            >
              <option value="">Stream…</option>
              {streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="section-title" style={{ margin: '0 0 0.5rem' }}>Scores (for the period selected above)</div>
            <div className="form-grid">
              <input
                className="input"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="Attendance"
                value={form.attendance}
                onChange={(e) => updateForm('attendance', e.target.value)}
                required
              />
              <input
                className="input"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="Communication"
                value={form.communication}
                onChange={(e) => updateForm('communication', e.target.value)}
                required
              />
              <input
                className="input"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="Accountability"
                value={form.accountability}
                onChange={(e) => updateForm('accountability', e.target.value)}
                required
              />
              <input
                className="input"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="Creativity & Ownership"
                value={form.creativity}
                onChange={(e) => updateForm('creativity', e.target.value)}
                required
              />
              <input
                className="input"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="Project Delivery"
                value={form.project_delivery}
                onChange={(e) => updateForm('project_delivery', e.target.value)}
                required
              />
              <input
                className="input"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="Tech Skills"
                value={form.tech_skills}
                onChange={(e) => updateForm('tech_skills', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <input
              className="input"
              placeholder="Dev group name"
              value={form.dev_group_name}
              onChange={(e) => updateForm('dev_group_name', e.target.value)}
            />
          </div>

          <textarea
            className="input"
            placeholder="Weekly feedback"
            value={form.weekly_feedback}
            onChange={(e) => updateForm('weekly_feedback', e.target.value)}
          />

          <textarea
            className="input"
            placeholder="Action plan for the week ahead (individual or group)"
            value={form.action_plan}
            onChange={(e) => updateForm('action_plan', e.target.value)}
          />

          <button
            className="btn btn-primary"
            type="submit"
            style={{ width: 'fit-content' }}
            disabled={submitting || !periodFilter}
          >
            {submitting ? 'Adding…' : 'Add candidate'}
          </button>
          {!periodFilter && (
            <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
              Select a period above to enable adding a candidate.
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
          periodId={periodFilter}
          onScoreSaved={refresh}
          onDeactivate={canManage ? handleDeactivate : undefined}
        />
      )}
    </div>
  )
}