export default function CandidateTable({ candidates, onEdit, onDeactivate }) {
  if (!candidates.length) {
    return <p style={{ color: '#6b7280' }}>No candidates yet.</p>
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Code</th>
          <th style={styles.th}>Name</th>
          <th style={styles.th}>Stream</th>
          <th style={styles.th}>Status</th>
          <th style={styles.th}></th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((c) => (
          <tr key={c.id}>
            <td style={styles.td}>{c.candidate_code}</td>
            <td style={styles.td}>
              {c.first_name} {c.last_name}
            </td>
            <td style={styles.td}>{c.stream_name}</td>
            <td style={styles.td}>
              <span style={{ color: c.active ? '#059669' : '#dc2626' }}>
                {c.active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td style={styles.td}>
              {onEdit && (
                <button style={styles.linkButton} onClick={() => onEdit(c)}>
                  Edit
                </button>
              )}
              {onDeactivate && c.active && (
                <button style={styles.linkButton} onClick={() => onDeactivate(c)}>
                  Deactivate
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const styles = {
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  th: {
    textAlign: 'left',
    padding: '0.6rem 0.75rem',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '0.8rem',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  td: { padding: '0.6rem 0.75rem', borderBottom: '1px solid #f0f1f3', fontSize: '0.9rem' },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    padding: 0,
    marginRight: '0.75rem',
    fontSize: '0.85rem',
  },
}
