export default function RankingCard({ title, candidates, accentColor = '#111827' }) {
  return (
    <div style={{ ...styles.card, borderTop: `3px solid ${accentColor}` }}>
      <h4 style={styles.title}>{title}</h4>
      {candidates && candidates.length ? (
        candidates.map((c) => (
          <div key={c.candidate_id} style={styles.row}>
            <span>{c.candidate_name}</span>
            <span style={styles.score}>{c.overall_average ?? c.monthly_overall_average}</span>
          </div>
        ))
      ) : (
        <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No data yet</p>
      )}
    </div>
  )
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    minWidth: 200,
  },
  title: { margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.9rem' },
  score: { fontWeight: 600 },
}
