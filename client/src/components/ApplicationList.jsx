import React, { useState } from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ApplicationList({
  applications,
  loading,
  statusOptions,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const [confirmingId, setConfirmingId] = useState(null);

  const handleDeleteClick = (id) => {
    if (confirmingId === id) {
      onDelete(id);
      setConfirmingId(null);
    } else {
      setConfirmingId(id);
    }
  };

  if (loading) {
    return <div className="list-state">Loading applications…</div>;
  }

  if (applications.length === 0) {
    return (
      <div className="list-state list-empty">
        <p>No applications yet.</p>
        <p className="list-empty-sub">Add your first application to start tracking it.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="app-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Role</th>
            <th>Status</th>
            <th>Date</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} className={`row-status-${app.status.toLowerCase()}`}>
              <td className="cell-company">{app.company}</td>
              <td>{app.role}</td>
              <td>
                <select
                  className={`status-chip status-${app.status.toLowerCase()}`}
                  value={app.status}
                  onChange={(e) => onStatusChange(app.id, e.target.value)}
                  aria-label={`Status for ${app.company}`}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="cell-date">{formatDate(app.date)}</td>
              <td className="cell-actions">
                <button className="btn-icon" onClick={() => onEdit(app)} aria-label={`Edit ${app.company}`}>
                  Edit
                </button>
                <button
                  className={`btn-icon btn-danger ${confirmingId === app.id ? 'confirming' : ''}`}
                  onClick={() => handleDeleteClick(app.id)}
                  onBlur={() => setConfirmingId(null)}
                  aria-label={`Delete ${app.company}`}
                >
                  {confirmingId === app.id ? 'Confirm?' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
