import { useEffect, useState } from 'react'
import { listPeriods } from '../api/periods'
import { uploadScores } from '../api/uploads'
import UploadForm from '../components/UploadForm'

export default function UploadScores() {
  const [periods, setPeriods] = useState([])
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listPeriods('BIWEEKLY').then((res) => setPeriods(res.data))
  }, [])

  async function handleSubmit(file, periodId, createNewVersion) {
    setSubmitting(true)
    setError('')
    setResult(null)
    try {
      const res = await uploadScores(file, periodId, createNewVersion)
      setResult(res.data)
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.detail)
      } else if (err.response?.data?.detail) {
        setError(
          typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : JSON.stringify(err.response.data.detail)
        )
      } else {
        setError('Upload failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload Score Sheet</h1>
          <p className="page-subtitle">
            Auto-fill scores for a whole period from a spreadsheet: Candidate ID, Candidate Name, Stream,
            Communication, Attendance, Accountability, Project Delivery, Tech Skills, Creativity — plus optional
            Dev Group, Weekly Feedback, and Action Plan columns.
          </p>
        </div>
      </div>
      {error && <p className="alert alert-danger">{error}</p>}
      <UploadForm periods={periods} onSubmit={handleSubmit} submitting={submitting} result={result} />
    </div>
  )
}
