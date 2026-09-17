import { useEffect, useState } from 'react'
import { listCandidates } from '../api/candidates'
import { listPeriods } from '../api/periods'
import { getScore, submitManualScore } from '../api/scores'
import { useStreams } from '../context/StreamContext'

const EMPTY_SCORES = {
  attendance: '',
  communication: '',
  accountability: '',
  creativity: '',
  project_delivery: '',
  tech_skills: '',
}

export default function ManualEntry() {
  const { streams } = useStreams()

  const [streamId, setStreamId] = useState('')
  const [candidates, setCandidates] = useState([])
  const [candidateId, setCandidateId] = useState('')

  const [periods, setPeriods] = useState([])
  const [periodId, setPeriodId] = useState('')

  const [scores, setScores] = useState(EMPTY_SCORES)
  const [devGroupName, setDevGroupName] = useState('')
  const [weeklyFeedback, setWeeklyFeedback] = useState('')
  const [actionPlan, setActionPlan] = useState('')
  const [commitmentType, setCommitmentType] = useState('INDIVIDUAL')

  const [loadingExisting, setLoadingExisting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
     listPeriods('BIWEEKLY').then((res) => setPeriods(res.data))
   }, [])

  useEffect(() => {
    listPeriods('BIWEEKLY').then((res) => setPeriods(res.data))
  }, [])

  useEffect(() => {
    if (!streamId) {
      setCandidates([])
      return
    }
    listCandidates({ stream_id: Number(streamId), active_only: true }).then((res) => setCandidates(res.data))
    setCandidateId('')
  }, [streamId])

  // Prefill from an existing score if this candidate already has one for the selected period.
  useEffect(() => {
    setResult(null)
    if (!candidateId || !periodId) {
      setScores(EMPTY_SCORES)
      setDevGroupName('')
      setWeeklyFeedback('')
      setActionPlan('')
      setCommitmentType('INDIVIDUAL')
      return
    }
    setLoadingExisting(true)
    getScore(candidateId, periodId)
      .then((res) => {
        const s = res.data
        if (s) {
          setScores({
            attendance: s.attendance,
            communication: s.communication,
            accountability: s.accountability,
            creativity: s.creativity,
            project_delivery: s.project_delivery,
            tech_skills: s.tech_skills,
          })
          setDevGroupName(s.dev_group_name || '')
          setWeeklyFeedback(s.weekly_feedback || '')
          setActionPlan(s.action_plan || '')
          setCommitmentType(s.commitment_type || 'INDIVIDUAL')
        } else {
          setScores(EMPTY_SCORES)
          setDevGroupName('')
          setWeeklyFeedback('')
          setActionPlan('')
          setCommitmentType('INDIVIDUAL')
        }
      })
      .finally(() => setLoadingExisting(false))
  }, [candidateId, periodId])

  const selectedCandidate = candidates.find((c) => String(c.id) === String(candidateId))

  function updateScore(field, value) {
    setScores((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await submitManualScore({
        candidate_id: Number(candidateId),
        period_id: Number(periodId),
        attendance: Number(scores.attendance),
        communication: Number(scores.communication),
        accountability: Number(scores.accountability),
        creativity: Number(scores.creativity),
        project_delivery: Number(scores.project_delivery),
        tech_skills: Number(scores.tech_skills),
        dev_group_name: devGroupName || null,
        weekly_feedback: weeklyFeedback || null,
        action_plan: actionPlan || null,
        commitment_type: commitmentType,
      })
      setResult(res.data)
    } catch (err) {
      setError(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Could not save this score — check the values and try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manual Score Entry</h1>
          <p className="page-subtitle">
            Key in one candidate's weekly scores, dev group, feedback, and action plan by hand. Overall score is
            calculated automatically once you save.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-grid">
          <label className="field">
            Stream
            <select
              className="input"
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
               required
             >
              <option value="">Select a stream…</option>
              {streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Candidate
            <select className="input" value={candidateId} onChange={(e) => setCandidateId(e.target.value)} required disabled={!streamId}>
              <option value="">Select a candidate…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} ({c.candidate_code})
                </option>
              ))}
            </select>
          </label>

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
        </div>

        {loadingExisting && <p className="muted" style={{ margin: 0 }}>Checking for an existing entry…</p>}

        <div>
          <div className="section-title" style={{ margin: '0 0 0.75rem' }}>Scores (0–100)</div>
          <div className="form-grid">
            <ScoreField label="Attendance" value={scores.attendance} onChange={(v) => updateScore('attendance', v)} />
            <ScoreField label="Communication" value={scores.communication} onChange={(v) => updateScore('communication', v)} />
            <ScoreField label="Accountability" value={scores.accountability} onChange={(v) => updateScore('accountability', v)} />
            <ScoreField label="Creativity & Ownership" value={scores.creativity} onChange={(v) => updateScore('creativity', v)} />
            <ScoreField label="Subject Deliverables" value={scores.project_delivery} onChange={(v) => updateScore('project_delivery', v)} />
            <ScoreField label="Tech Skills" value={scores.tech_skills} onChange={(v) => updateScore('tech_skills', v)} />
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            Dev group name
            <input
              className="input"
              placeholder="e.g. Squad Alpha"
              value={devGroupName}
              onChange={(e) => setDevGroupName(e.target.value)}
            />
          </label>

          <label className="field">
            Commitment for the week ahead
            <div className="radio-group" style={{ paddingTop: '0.5rem' }}>
              <label>
                <input type="radio" checked={commitmentType === 'INDIVIDUAL'} onChange={() => setCommitmentType('INDIVIDUAL')} />
                Individual
              </label>
              <label>
                <input type="radio" checked={commitmentType === 'GROUP'} onChange={() => setCommitmentType('GROUP')} />
                Group
              </label>
            </div>
          </label>
        </div>

        <label className="field">
          Weekly feedback
          <textarea
            className="input"
            placeholder="How did the week go for this candidate?"
            value={weeklyFeedback}
            onChange={(e) => setWeeklyFeedback(e.target.value)}
          />
        </label>

        <label className="field">
          Action plan for the week ahead
          <textarea
            className="input"
            placeholder="What is the individual or group commitment for next week?"
            value={actionPlan}
            onChange={(e) => setActionPlan(e.target.value)}
          />
        </label>

        {error && <p className="alert alert-danger" style={{ margin: 0 }}>{error}</p>}

        {result && (
          <div className="alert alert-success" style={{ margin: 0 }}>
            Saved{selectedCandidate ? ` for ${selectedCandidate.first_name} ${selectedCandidate.last_name}` : ''}. Overall
            score: <strong>{result.overall_average}</strong> (TDC {result.tdc_average}, Tech {result.tech_average}) — currently
            ranked #{result.ranking} for this period.
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }} disabled={submitting || !candidateId || !periodId}>
          {submitting ? 'Saving…' : 'Save score'}
        </button>
      </form>
    </div>
  )
}

function ScoreField({ label, value, onChange }) {
  return (
    <label className="field">
      {label}
      <input
        className="input"
        type="number"
        min="0"
        max="100"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </label>
  )
}
