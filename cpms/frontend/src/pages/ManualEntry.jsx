import { Fragment, useEffect, useMemo, useState } from 'react'
import { listCandidates } from '../api/candidates'
import { createPeriod, listPeriods } from '../api/periods'
import { submitManualScore } from '../api/scores'
import { useCohorts } from '../context/CohortContext'
import { useStreams } from '../context/StreamContext'

const SCORE_FIELDS = [
  ['attendance', 'Attendance'],
  ['communication', 'Communication'],
  ['accountability', 'Accountability'],
  ['creativity', 'Creativity & Ownership'],
  ['project_delivery', 'Project Delivery'],
  ['tech_skills', 'Tech Skills'],
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function emptyRow() {
  return {
    attendance: '', communication: '', accountability: '',
    creativity: '', project_delivery: '', tech_skills: '',
    dev_group_name: '', weekly_feedback: '', action_plan: '', commitment_type: 'INDIVIDUAL',
  }
}

function rowFromCandidate(c) {
  return {
    attendance: c.attendance ?? '',
    communication: c.communication ?? '',
    accountability: c.accountability ?? '',
    creativity: c.creativity ?? '',
    project_delivery: c.project_delivery ?? '',
    tech_skills: c.tech_skills ?? '',
    dev_group_name: c.dev_group_name ?? '',
    weekly_feedback: c.weekly_feedback ?? '',
    action_plan: c.action_plan ?? '',
    commitment_type: c.commitment_type ?? 'INDIVIDUAL',
  }
}

function isRowComplete(row) {
  return SCORE_FIELDS.every(([f]) => row[f] !== '' && row[f] !== null && row[f] !== undefined)
}

function computeEntry(row) {
  const v = (f) => Number(row[f]) || 0
  const tdcRaw = v('attendance') + v('communication') + v('accountability')
  const techRaw = v('creativity') + v('project_delivery') + v('tech_skills')
  const tdcPct = (tdcRaw / 15) * 100
  const techPct = (techRaw / 15) * 100
  return { tdcPct, techPct, overallPct: (tdcPct + techPct) / 2 }
}

function fmt(v) {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(1)
}

function bandClasses(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return ''
  if (pct >= 75) return 'alert-success'
  if (pct >= 60) return ''
  return 'alert-danger'
}

// Groups periods by month/year, then labels the earliest-starting one in each
// group "Biweekly 1" and the next "Biweekly 2" (a 3rd, if it ever exists,
// becomes "Biweekly 3" rather than breaking). This is a display label only —
// nothing about it is stored in the database.
function labelPeriods(periods) {
  const groups = {}
  for (const p of periods) {
    const key = `${p.year}-${p.month}`
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }
  const labels = {}
  Object.values(groups).forEach((group) => {
    const sorted = [...group].sort((a, b) => a.start_date.localeCompare(b.start_date))
    sorted.forEach((p, i) => {
      labels[p.id] = `${MONTH_NAMES[p.month - 1]} ${p.year} - Biweekly ${i + 1}`
    })
  })
  return labels
}

export default function ManualEntry() {
  const { cohorts, currentCohortId } = useCohorts()
  const { streams, currentStreamId } = useStreams()

  const [scopeType, setScopeType] = useState('cohort')
  const [cohortId, setCohortId] = useState(currentCohortId)
  const [streamId, setStreamId] = useState(currentStreamId)

  const [periods, setPeriods] = useState([])
  const [periodId, setPeriodId] = useState('')
  const [periodForm, setPeriodForm] = useState({ start_date: '', end_date: '' })
  const [showPeriodForm, setShowPeriodForm] = useState(false)
  const [periodError, setPeriodError] = useState('')
  const [periodSubmitting, setPeriodSubmitting] = useState(false)

  const [candidates, setCandidates] = useState([])
  const [rows, setRows] = useState({}) // candidateId -> row fields being edited
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [rowStatus, setRowStatus] = useState({}) // candidateId -> 'saving' | 'saved' | error string
  const [savingAll, setSavingAll] = useState(false)

  const periodLabels = useMemo(() => labelPeriods(periods), [periods])

  useEffect(() => {
    listPeriods('BIWEEKLY').then((res) => setPeriods(res.data))
  }, [])

  useEffect(() => { setCohortId(currentCohortId) }, [currentCohortId])
  useEffect(() => { setStreamId(currentStreamId) }, [currentStreamId])

  function refreshCandidates() {
    const scopeId = scopeType === 'cohort' ? cohortId : streamId
    if (!scopeId || !periodId) {
      setCandidates([])
      setRows({})
      return
    }
    setLoading(true)
    const params = { period_id: Number(periodId), active_only: true }
    if (scopeType === 'cohort') params.cohort_id = Number(scopeId)
    else params.stream_id = Number(scopeId)

    listCandidates(params)
      .then((res) => {
        setCandidates(res.data)
        const next = {}
        res.data.forEach((c) => { next[c.id] = rowFromCandidate(c) })
        setRows(next)
        setRowStatus({})
      })
      .finally(() => setLoading(false))
  }

  useEffect(refreshCandidates, [scopeType, cohortId, streamId, periodId]) // eslint-disable-line react-hooks/exhaustive-deps

  const SCORE_FIELD_SET = new Set(SCORE_FIELDS.map(([f]) => f))

  function updateField(candidateId, field, value) {
    let clean = value
    // Only the six 1-5 score boxes get clamped - free-text fields like
    // weekly_feedback pass through untouched. An empty string is left alone
    // so the person can clear a box while retyping, instead of it snapping
    // back to a number mid-edit.
    if (SCORE_FIELD_SET.has(field) && value !== '') {
      const n = Math.round(Number(value))
      clean = Number.isNaN(n) ? '' : String(Math.max(1, Math.min(5, n)))
    }
    setRows((prev) => ({ ...prev, [candidateId]: { ...prev[candidateId], [field]: clean } }))
    setRowStatus((prev) => ({ ...prev, [candidateId]: undefined }))
  }

  async function saveRow(candidateId) {
    const row = rows[candidateId]
    if (!isRowComplete(row)) return
    setRowStatus((prev) => ({ ...prev, [candidateId]: 'saving' }))
    try {
      await submitManualScore({
        candidate_id: candidateId,
        period_id: Number(periodId),
        attendance: Number(row.attendance),
        communication: Number(row.communication),
        accountability: Number(row.accountability),
        creativity: Number(row.creativity),
        project_delivery: Number(row.project_delivery),
        tech_skills: Number(row.tech_skills),
        dev_group_name: row.dev_group_name || null,
        weekly_feedback: row.weekly_feedback || null,
        action_plan: row.action_plan || null,
        commitment_type: row.commitment_type,
      })
      setRowStatus((prev) => ({ ...prev, [candidateId]: 'saved' }))
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [candidateId]: typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Could not save',
      }))
    }
  }

  async function saveAll() {
    setSavingAll(true)
    const ready = candidates.map((c) => c.id).filter((id) => isRowComplete(rows[id]))
    await Promise.all(ready.map((id) => saveRow(id)))
    setSavingAll(false)
  }

  function updatePeriodForm(field, value) {
    setPeriodForm((prev) => {
      const next = { ...prev, [field]: value }
      return next
    })
  }

  async function handleCreatePeriod(e) {
    e.preventDefault()
    setPeriodSubmitting(true)
    setPeriodError('')
    try {
      const d = new Date(periodForm.start_date)
      const res = await createPeriod({
        period_type: 'BIWEEKLY',
        start_date: periodForm.start_date,
        end_date: periodForm.end_date,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
      })
      const updated = await listPeriods('BIWEEKLY')
      setPeriods(updated.data)
      setPeriodId(String(res.data.id))
      setPeriodForm({ start_date: '', end_date: '' })
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

  const readyCount = candidates.filter((c) => isRowComplete(rows[c.id] || {})).length

  return (
    <div className="page-narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">Biweekly Score Entry</h1>
          <p className="page-subtitle">
            Pick a biweekly period and a cohort or stream, then score everyone at once. Overall score is
            calculated automatically as you type.
          </p>
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: '1rem' }}>
        <span className="muted" style={{ fontSize: '0.85rem', marginRight: '0.25rem' }}>Scope:</span>
        <button type="button" className={`btn-pill ${scopeType === 'cohort' ? 'active' : ''}`} onClick={() => setScopeType('cohort')}>
          Cohort
        </button>
        <button type="button" className={`btn-pill ${scopeType === 'stream' ? 'active' : ''}`} onClick={() => setScopeType('stream')}>
          Stream
        </button>
      </div>

      <div className="form-row" style={{ marginBottom: '1rem', alignItems: 'center', gap: '1rem' }}>
        {scopeType === 'cohort' ? (
          <select className="input" style={{ width: 'auto' }} value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
            <option value="">Select a cohort…</option>
            {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          <select className="input" style={{ width: 'auto' }} value={streamId} onChange={(e) => setStreamId(e.target.value)}>
            <option value="">Select a stream…</option>
            {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        <select className="input" style={{ width: 'auto' }} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
          <option value="">Select a biweekly period…</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{periodLabels[p.id]}</option>
          ))}
        </select>

        <button type="button" className="btn-link" onClick={() => setShowPeriodForm((v) => !v)}>
          {showPeriodForm ? 'Cancel' : '+ New biweekly period'}
        </button>
      </div>

      {showPeriodForm && (
        <form onSubmit={handleCreatePeriod} className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 480 }}>
          <div className="form-grid">
            <label className="field" style={{ fontSize: '0.8rem' }}>
              Start date
              <input className="input" type="date" value={periodForm.start_date}
                onChange={(e) => updatePeriodForm('start_date', e.target.value)} required />
            </label>
            <label className="field" style={{ fontSize: '0.8rem' }}>
              End date
              <input className="input" type="date" value={periodForm.end_date}
                onChange={(e) => updatePeriodForm('end_date', e.target.value)} required />
            </label>
          </div>
          <div className="muted" style={{ fontSize: '0.78rem' }}>
            Whichever biweekly period starts earliest in a given month is shown as "Biweekly 1", the next as
            "Biweekly 2" - you don't need to pick a number yourself.
          </div>
          {periodError && <p className="alert alert-danger" style={{ margin: 0 }}>{periodError}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }} disabled={periodSubmitting}>
            {periodSubmitting ? 'Creating…' : 'Create period'}
          </button>
        </form>
      )}

      {!periodId || !(scopeType === 'cohort' ? cohortId : streamId) ? (
        <p className="muted">Select a {scopeType} and a biweekly period above to start entering scores.</p>
      ) : loading ? (
        <p className="muted">Loading…</p>
      ) : candidates.length === 0 ? (
        <p className="muted">No active candidates in this {scopeType} yet.</p>
      ) : (
        <>
          <div className="form-row" style={{ marginBottom: '0.75rem', alignItems: 'center' }}>
            <button type="button" className="btn btn-primary" disabled={savingAll || readyCount === 0} onClick={saveAll}>
              {savingAll ? 'Saving…' : `Save all complete rows (${readyCount}/${candidates.length})`}
            </button>
          </div>

          <div className="table-wrap" style={{ marginBottom: '2rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  {SCORE_FIELDS.map(([f, label]) => (
                    <th key={f} style={{ textAlign: 'center' }}>{label}</th>
                  ))}
                  <th style={{ textAlign: 'center' }}>Overall %</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const row = rows[c.id] || emptyRow()
                  const complete = isRowComplete(row)
                  const { overallPct } = complete ? computeEntry(row) : { overallPct: null }
                  const status = rowStatus[c.id]
                  return (
                    <Fragment key={c.id}>
                      <tr>
                        <td>{c.first_name} {c.last_name}<div className="muted" style={{ fontSize: '0.72rem' }}>{c.candidate_code}</div></td>
                        {SCORE_FIELDS.map(([f]) => (
                          <td key={f} style={{ textAlign: 'center' }}>
                            <input
                              type="number" min="1" max="5" step="1"
                              value={row[f]}
                              onChange={(e) => updateField(c.id, f, e.target.value)}
                              style={{ width: '3.2rem', textAlign: 'center' }}
                              className="input"
                            />
                          </td>
                        ))}
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{fmt(overallPct)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button type="button" className="btn btn-primary" disabled={!complete || status === 'saving'} onClick={() => saveRow(c.id)}>
                            {status === 'saving' ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                        <td>
                          <button type="button" className="btn-link" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                            {expandedId === c.id ? 'Hide notes' : 'Notes'}
                          </button>
                        </td>
                      </tr>
                      {status && status !== 'saving' && (
                        <tr>
                          <td colSpan={SCORE_FIELDS.length + 3} style={{ paddingTop: 0 }}>
                            {status === 'saved' ? (
                              <span className="alert alert-success" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Saved</span>
                            ) : (
                              <span className="alert alert-danger" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>{status}</span>
                            )}
                          </td>
                        </tr>
                      )}
                      {expandedId === c.id && (
                        <tr>
                          <td colSpan={SCORE_FIELDS.length + 3}>
                            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div className="form-grid">
                                <label className="field">
                                  Dev group name
                                  <input className="input" value={row.dev_group_name}
                                    onChange={(e) => updateField(c.id, 'dev_group_name', e.target.value)} />
                                </label>
                                <label className="field">
                                  Commitment for the week ahead
                                  <div className="radio-group" style={{ paddingTop: '0.5rem' }}>
                                    <label>
                                      <input type="radio" checked={row.commitment_type === 'INDIVIDUAL'}
                                        onChange={() => updateField(c.id, 'commitment_type', 'INDIVIDUAL')} /> Individual
                                    </label>
                                    <label>
                                      <input type="radio" checked={row.commitment_type === 'GROUP'}
                                        onChange={() => updateField(c.id, 'commitment_type', 'GROUP')} /> Group
                                    </label>
                                  </div>
                                </label>
                              </div>
                              <label className="field">
                                Weekly feedback
                                <textarea className="input" value={row.weekly_feedback}
                                  onChange={(e) => updateField(c.id, 'weekly_feedback', e.target.value)} />
                              </label>
                              <label className="field">
                                Action plan for the week ahead
                                <textarea className="input" value={row.action_plan}
                                  onChange={(e) => updateField(c.id, 'action_plan', e.target.value)} />
                              </label>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <h2 className="section-title">Results for {periodLabels[periodId]}</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Cohort</th>
                  <th>Stream</th>
                  {SCORE_FIELDS.map(([f, label]) => <th key={f} style={{ textAlign: 'center' }}>{label}</th>)}
                  <th style={{ textAlign: 'center' }}>TDC %</th>
                  <th style={{ textAlign: 'center' }}>Tech %</th>
                  <th style={{ textAlign: 'center' }}>Overall %</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const row = rows[c.id] || emptyRow()
                  const complete = isRowComplete(row)
                  const entry = complete ? computeEntry(row) : null
                  return (
                    <tr key={c.id}>
                      <td>{c.first_name} {c.last_name}</td>
                      <td>{c.cohort_name ?? '—'}</td>
                      <td>{c.stream_name ?? '—'}</td>
                      {SCORE_FIELDS.map(([f]) => <td key={f} style={{ textAlign: 'center' }}>{row[f] || '—'}</td>)}
                      <td className={bandClasses(entry?.tdcPct)} style={{ textAlign: 'center' }}>{entry ? fmt(entry.tdcPct) : '—'}</td>
                      <td className={bandClasses(entry?.techPct)} style={{ textAlign: 'center' }}>{entry ? fmt(entry.techPct) : '—'}</td>
                      <td className={bandClasses(entry?.overallPct)} style={{ textAlign: 'center', fontWeight: 700 }}>{entry ? fmt(entry.overallPct) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}