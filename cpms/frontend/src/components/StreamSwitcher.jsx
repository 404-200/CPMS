import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStreams } from '../context/StreamContext'

export default function StreamSwitcher() {
  const { user } = useAuth()
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role)
  const isAdmin = user && user.role === 'ADMIN'
  const { streams, currentStream, selectStream, addStream, removeStream } = useStreams()

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

  async function handleAddStream(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setError('')
    try {
      await addStream(newName.trim())
      setNewName('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not add stream')
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteStream(stream) {
    const confirmed = window.confirm(
      `Delete "${stream.name}"? This permanently removes every candidate in this stream and all their score history. This cannot be undone.`
    )
    if (!confirmed) return

    setDeletingId(stream.id)
    setError('')
    try {
      await removeStream(stream.id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete stream')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="stream-switcher" ref={ref}>
      <button type="button" className="stream-switcher-trigger" onClick={() => setOpen((o) => !o)}>
        {currentStream ? currentStream.name : streams.length ? 'Select stream' : 'No streams yet'}
        <span aria-hidden>▾</span>
      </button>

      {open && (
        <div className="stream-switcher-menu">
          {streams.length === 0 && <p className="muted" style={{ margin: '0.25rem 0.4rem', fontSize: '0.85rem' }}>No streams yet.</p>}
          {streams.map((s) => (
            <div
              key={s.id}
              className={`stream-switcher-item ${String(s.id) === String(currentStream?.id) ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span
                onClick={() => {
                  selectStream(String(s.id))
                  setOpen(false)
                }}
                style={{ flex: 1, cursor: 'pointer' }}
              >
                {s.name}
              </span>
              {String(s.id) === String(currentStream?.id) && <span style={{ marginRight: '0.4rem' }}>✓</span>}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDeleteStream(s)}
                  disabled={deletingId === s.id}
                  title={`Delete ${s.name}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-danger)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    padding: '0 0.3rem',
                  }}
                >
                  {deletingId === s.id ? '…' : '×'}
                </button>
              )}
            </div>
          ))}

          {canManage && (
            <form className="stream-switcher-add" onSubmit={handleAddStream}>
              <input
                placeholder="New stream name"
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