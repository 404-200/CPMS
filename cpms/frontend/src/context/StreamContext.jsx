import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createStream, deleteStream, listStreams } from '../api/candidates'
import { useAuth } from './AuthContext'

const StreamContext = createContext(null)

const STORAGE_KEY = 'cpms_current_stream_id'

export function StreamProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [streams, setStreams] = useState([])
  const [currentStreamId, setCurrentStreamId] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    return listStreams()
      .then((res) => {
        setStreams(res.data)
        return res.data
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    refresh().then((data) => {
      // If nothing selected yet (or the saved stream no longer exists), default to the first one.
      setCurrentStreamId((prev) => {
        if (prev && data.some((s) => String(s.id) === String(prev))) return prev
        return data.length ? String(data[0].id) : ''
      })
    })
  }, [isAuthenticated, refresh])

  function selectStream(streamId) {
    setCurrentStreamId(streamId)
    localStorage.setItem(STORAGE_KEY, streamId)
  }

  async function addStream(name) {
    const res = await createStream({ name })
    await refresh()
    selectStream(String(res.data.id))
    return res.data
  }

  async function removeStream(streamId) {
    await deleteStream(streamId)
    const data = await refresh()
    // If the deleted stream was selected, fall back to the first remaining one (or none).
    setCurrentStreamId((prev) => {
      if (String(prev) !== String(streamId)) return prev
      const fallback = data.length ? String(data[0].id) : ''
      localStorage.setItem(STORAGE_KEY, fallback)
      return fallback
    })
  }

  const currentStream = streams.find((s) => String(s.id) === String(currentStreamId)) || null

  const value = {
    streams,
    loading,
    currentStreamId,
    currentStream,
    selectStream,
    addStream,
    removeStream,
    refreshStreams: refresh,
  }

  return <StreamContext.Provider value={value}>{children}</StreamContext.Provider>
}

export function useStreams() {
  const ctx = useContext(StreamContext)
  if (!ctx) throw new Error('useStreams must be used within a StreamProvider')
  return ctx
}