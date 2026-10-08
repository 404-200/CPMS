import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createCohort, deleteCohort, listCohorts } from '../api/candidates'
import { useAuth } from './AuthContext'

const CohortContext = createContext(null)

const STORAGE_KEY = 'cpms_current_cohort_id'

export function CohortProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [cohorts, setCohorts] = useState([])
  const [currentCohortId, setCurrentCohortId] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    return listCohorts()
      .then((res) => {
        setCohorts(res.data)
        return res.data
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    refresh().then((data) => {
      // If nothing selected yet (or the saved cohort no longer exists), default to the first one.
      setCurrentCohortId((prev) => {
        if (prev && data.some((c) => String(c.id) === String(prev))) return prev
        return data.length ? String(data[0].id) : ''
      })
    })
  }, [isAuthenticated, refresh])

  function selectCohort(cohortId) {
    setCurrentCohortId(cohortId)
    localStorage.setItem(STORAGE_KEY, cohortId)
  }

  async function addCohort(name) {
    const res = await createCohort({ name })
    await refresh()
    selectCohort(String(res.data.id))
    return res.data
  }

  async function removeCohort(cohortId) {
    await deleteCohort(cohortId)
    const data = await refresh()
    // If the deleted cohort was selected, fall back to the first remaining one (or none).
    setCurrentCohortId((prev) => {
      if (String(prev) !== String(cohortId)) return prev
      const fallback = data.length ? String(data[0].id) : ''
      localStorage.setItem(STORAGE_KEY, fallback)
      return fallback
    })
  }

  const currentCohort = cohorts.find((c) => String(c.id) === String(currentCohortId)) || null

  const value = {
    cohorts,
    loading,
    currentCohortId,
    currentCohort,
    selectCohort,
    addCohort,
    removeCohort,
    refreshCohorts: refresh,
  }

  return <CohortContext.Provider value={value}>{children}</CohortContext.Provider>
}

export function useCohorts() {
  const ctx = useContext(CohortContext)
  if (!ctx) throw new Error('useCohorts must be used within a CohortProvider')
  return ctx
}