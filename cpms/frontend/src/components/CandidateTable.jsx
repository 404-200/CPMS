import { useState } from 'react'

/**
 * Reusable candidate table.
 *
 * Every feature is switched on by passing its handler, so other pages can
 * reuse this component and only get what they ask for:
 *
 *   candidates        (required) list of candidates from the API
 *   streams           list of { id, name } - needed for stream dropdowns
 *   onAssignStreams   async (candidateIds[], streamId) => void
 *                     enables the per-row stream dropdown, the checkboxes
 *                     and the "assign selected" bar
 *   onDeactivate      async (candidate) => void  (asks "are you sure?" first)
 *   onDelete          async (candidate) => void  (asks "are you sure?" first)
 */
export default function CandidateTable({
  candidates,
  streams = [],
  onAssignStreams,
  onDeactivate,
  onDelete,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkStreamId, setBulkStreamId] = useState('')
  const [busy, setBusy] = useState(false)

  if (!candidates.length) {
    return <p className="muted">No candidates yet.</p>
  }

  const canAssign = Boolean(onAssignStreams)
  const showActions = Boolean(onDeactivate || onDelete)

  // Only count selections that are still in the table (e.g. after a filter change).
  const visibleIds = candidates.map((c) => c.id)
  const selected = visibleIds.filter((id) => selectedIds.has(id))
  const allSelected = selected.length === visibleIds.length

  function toggleOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(visibleIds))
  }

  async function run(action) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  function assignOne(candidate, streamId) {
    if (!streamId) return
    run(() => onAssignStreams([candidate.id], Number(streamId)))
  }

  function assignSelected() {
    if (!bulkStreamId || selected.length === 0) return
    run(async () => {
      await onAssignStreams(selected, Number(bulkStreamId))
      setSelectedIds(new Set())
      setBulkStreamId('')
    })
  }

  function handleDeactivate(candidate) {
    const ok = window.confirm(
      `Are you sure you want to deactivate ${candidate.first_name} ${candidate.last_name}?`
    )
    if (ok) run(() => onDeactivate(candidate))
  }

  function handleDelete(candidate) {
    const ok = window.confirm(
      `Permanently delete ${candidate.first_name} ${candidate.last_name} (${candidate.candidate_code})? ` +
        'Their score history will be deleted too. This cannot be undone.'
    )
    if (ok) run(() => onDelete(candidate))
  }

  return (
    <div>
      {canAssign && selected.length > 0 && (
        <div className="card" style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '0.9rem' }}>{selected.length} selected</strong>
          <select
            className="input"
            style={{ width: 'auto' }}
            value={bulkStreamId}
            onChange={(e) => setBulkStreamId(e.target.value)}
          >
            <option value="">Assign to stream…</option>
            {streams.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !bulkStreamId}
            onClick={assignSelected}
          >
            {busy ? 'Saving…' : 'Apply'}
          </button>
          <button type="button" className="btn-link" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {canAssign && (
                <th style={{ width: '2rem' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all candidates"
                  />
                </th>
              )}
              <th>Name</th>
              <th>Cohort</th>
              <th>Stream</th>
              <th>Status</th>
              {showActions && <th></th>}
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                {canAssign && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      aria-label={`Select ${c.first_name} ${c.last_name}`}
                    />
                  </td>
                )}

                <td>
                  {c.first_name} {c.last_name}
                  <div className="muted" style={{ fontSize: '0.72rem' }}>{c.candidate_code}</div>
                </td>

                <td>{c.cohort_name ?? '—'}</td>

                <td>
                  {canAssign ? (
                    <select
                      className="input"
                      style={{ minWidth: '9rem' }}
                      value={c.stream_id ?? ''}
                      disabled={busy}
                      onChange={(e) => assignOne(c, e.target.value)}
                    >
                      <option value="" disabled>Not assigned</option>
                      {streams.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    c.stream_name ?? '—'
                  )}
                </td>

                <td>
                  <span className={`badge ${c.active ? 'badge-success' : 'badge-danger'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {showActions && (
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {onDeactivate && c.active && (
                      <button
                        type="button"
                        className="btn-danger-text"
                        style={{ marginRight: '0.75rem' }}
                        disabled={busy}
                        onClick={() => handleDeactivate(c)}
                      >
                        Deactivate
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="btn-danger-text"
                        disabled={busy}
                        onClick={() => handleDelete(c)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}