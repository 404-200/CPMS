import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCohorts } from '../context/CohortContext'

export default function CohortSwitcher() {
  const { user } = useAuth()
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role)
  const isAdmin = user && user.role === 'ADMIN'
  const { cohorts, currentCohort, selectCohort, addCohort, removeCohort } = useCohorts()

  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleAddCohort(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setError('')
    try {
      await addCohort(newName.trim())
      setNewName('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not add cohort')
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteCohort(cohort) {
    const confirmed = window.confirm(
      `Delete "${cohort.name}"? This only works while the cohort has no candidates in it.`
    )
    if (!confirmed) return

    setDeletingId(cohort.id)
    setError('')
    try {
      await removeCohort(cohort.id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete cohort')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="stream-switcher" ref={ref}>
      <button type="button" className="stream-switcher-trigger" onClick={() => setOpen((o) => !o)}>
        {currentCohort ? currentCohort.name : cohorts.length ? 'Select cohort' : 'No cohorts yet'}
        <span aria-hidden>▾</span>
      </button>

      {open && (
        <div className="stream-switcher-menu">
          {cohorts.length === 0 && <p className="muted" style={{ margin: '0.25rem 0.4rem', fontSize: '0.85rem' }}>No cohorts yet.</p>}
          {cohorts.map((c) => (
            <div
              key={c.id}
              className={`stream-switcher-item ${String(c.id) === String(currentCohort?.id) ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span
                onClick={() => {
                  selectCohort(String(c.id))
                  setOpen(false)
                }}
                style={{ flex: 1, cursor: 'pointer' }}
              >
                {c.name}
              </span>
              {String(c.id) === String(currentCohort?.id) && <span style={{ marginRight: '0.4rem' }}>✓</span>}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDeleteCohort(c)}
                  disabled={deletingId === c.id}
                  title={`Delete ${c.name}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-danger)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    padding: '0 0.3rem',
                  }}
                >
                  {deletingId === c.id ? '…' : '×'}
                </button>
              )}
            </div>
          ))}

          {canManage && (
            <form className="stream-switcher-add" onSubmit={handleAddCohort}>
              <input
                placeholder="New cohort name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.7rem' }} disabled={adding}>
                +
              </button>
            </form>
          )}
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.78rem', margin: '0.35rem 0.4rem 0' }}>{error}</p>}
        </div>
      )}
    </div>
  )
}