export default function RankingCard({ title, candidates, accentColor = 'var(--color-navy)' }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${accentColor}`, minWidth: 200, flex: 1 }}>
      <div className="stat-label">{title}</div>
      <div style={{ marginTop: '0.6rem' }}>
        {candidates && candidates.length ? (
          candidates.map((c) => (
            <div key={c.candidate_id} className="ranking-row">
              <span>{c.candidate_name}</span>
              <span className="ranking-score">{c.overall_average ?? c.monthly_overall_average}</span>
            </div>
          ))
        ) : (
          <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>No data yet</p>
        )}
      </div>
    </div>
  )
}
