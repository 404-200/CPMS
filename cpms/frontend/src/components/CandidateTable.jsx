import { useState } from 'react'
import { submitManualScore } from '../api/scores'

function scoreColor(value) {
  if (value == null) return 'transparent'
  if (value <= 2) return '#E8A33D' // orange
  if (value === 3) return '#F5E050' // yellow
  return '#7DC242' // green (4-5)
}

function overallColor(pct) {
  if (pct == null) return '#e5e5e5'
  if (pct < 65) return '#E05B4F' // red
  if (pct < 75) return '#F5E050' // yellow
  return '#7DC242' // green
}

function ScoreCell({ value }) {
  return (
    <td style={{ background: scoreColor(value), textAlign: 'center', fontWeight: 600 }}>
      {value ?? '—'}
    </td>
  )
}

const SCORE_FIELDS = [
  ['attendance', 'Attendance'],
  ['communication', 'Communication'],
  ['accountability', 'Accountability'],
  ['creativity', 'Creativity & Ownership'],
  ['project_delivery', 'Project Delivery'],
  ['tech_skills', 'Tech Skills'],
]

function emptyFormFrom(candidate) {
  return {
    attendance: candidate.attendance ?? '',
    communication: candidate.communication ?? '',
    accountability: candidate.accountability ?? '',
    creativity: candidate.creativity ?? '',
    project_delivery: candidate.project_delivery ?? '',
    tech_skills: candidate.tech_skills ?? '',
    dev_group_name: candidate.dev_group_name ?? '',
    weekly_feedback: candidate.weekly_feedback ?? '',
    action_plan: candidate.action_plan ?? '',
  }
}

export default function CandidateTable({ candidates, periodId, onScoreSaved, onEdit, onDeactivate }) {
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [rowError, setRowError] = useState('')

  if (!candidates.length) {
    return <p className="muted">No candidates yet.</p>
  }

  function startEdit(candidate) {
    setEditingId(candidate.id)
    setForm(emptyFormFrom(candidate))
    setRowError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({})
    setRowError('')
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function saveEdit(candidateId) {
    if (!periodId) {
      setRowError('Select a period above before entering scores.')
      return
    }
    setSaving(true)
    setRowError('')
    try {
      await submitManualScore({
        candidate_id: candidateId,
        period_id: Number(periodId),
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
      setEditingId(null)
      setForm({})
      if (onScoreSaved) onScoreSaved()
    } catch (err) {
      setRowError(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Could not save these scores — check the values and try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Stream</th>
            {SCORE_FIELDS.map(([field, label]) => (
              <th key={field} style={{ textAlign: 'center' }}>
                {label}
              </th>
            ))}
            <th style={{ textAlign: 'center' }}>Overall Score</th>
            <th>Dev Group</th>
            <th>Weekly Feedback</th>
            <th>Action Plan</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => {
            const isEditing = editingId === c.id

            return (
              <tr key={c.id}>
                <td>
                  {c.first_name} {c.last_name}
                </td>
                <td>{c.stream_name}</td>

                {isEditing
                  ? SCORE_FIELDS.map(([field]) => (
                      <td key={field} style={{ textAlign: 'center' }}>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          style={{ width: '4rem', textAlign: 'center' }}
                          value={form[field]}
                          onChange={(e) => updateField(field, e.target.value)}
                        />
                      </td>
                    ))
                  : SCORE_FIELDS.map(([field]) => <ScoreCell key={field} value={c[field]} />)}

                <td style={{ textAlign: 'center' }}>
                  {c.overall_average != null ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2.6rem',
                        height: '2.6rem',
                        borderRadius: '50%',
                        background: overallColor(c.overall_average),
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      {Math.round(c.overall_average)}%
                    </span>
                  ) : (
                    '—'
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      className="input"
                      style={{ width: '8rem' }}
                      value={form.dev_group_name}
                      onChange={(e) => updateField('dev_group_name', e.target.value)}
                    />
                  ) : (
                    c.dev_group_name ?? '—'
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <textarea
                      className="input"
                      style={{ width: '10rem', minHeight: '2.5rem' }}
                      value={form.weekly_feedback}
                      onChange={(e) => updateField('weekly_feedback', e.target.value)}
                    />
                  ) : (
                    c.weekly_feedback ?? '—'
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <textarea
                      className="input"
                      style={{ width: '10rem', minHeight: '2.5rem' }}
                      value={form.action_plan}
                      onChange={(e) => updateField('action_plan', e.target.value)}
                    />
                  ) : (
                    c.action_plan ?? '—'
                  )}
                </td>

                <td>
                  <span className={`badge ${c.active ? 'badge-success' : 'badge-danger'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                <td style={{ whiteSpace: 'nowrap' }}>
                  {isEditing ? (
                    <>
                      <button
                        className="btn-link"
                        style={{ marginRight: '0.5rem' }}
                        onClick={() => saveEdit(c.id)}
                        disabled={saving}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button className="btn-link" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </button>
                      {rowError && (
                        <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          {rowError}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <button className="btn-link" style={{ marginRight: '0.75rem' }} onClick={() => startEdit(c)}>
                        Edit scores
                      </button>
                      {onEdit && (
                        <button className="btn-link" style={{ marginRight: '0.75rem' }} onClick={() => onEdit(c)}>
                          Edit
                        </button>
                      )}
                      {onDeactivate && c.active && (
                        <button className="btn-danger-text" onClick={() => onDeactivate(c)}>
                          Deactivate
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}