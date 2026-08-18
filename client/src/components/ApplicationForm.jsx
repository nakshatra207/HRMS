import React, { useState } from 'react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ApplicationForm({ initialData, statusOptions, onSubmit, onClose }) {
  const isEditing = Boolean(initialData);

  const [company, setCompany] = useState(initialData?.company || '');
  const [role, setRole] = useState(initialData?.role || '');
  const [status, setStatus] = useState(initialData?.status || statusOptions[0]);
  const [date, setDate] = useState(initialData?.date || todayISO());
  const [formError, setFormError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!company.trim() || !role.trim() || !date) {
      setFormError('Company, role and date are required.');
      return;
    }

    onSubmit({ company: company.trim(), role: role.trim(), status, date });
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <div className="modal-header">
          <h2 id="form-title">{isEditing ? 'Edit Application' : 'Add Application'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close form">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="app-form">
          {formError && <p className="form-error">{formError}</p>}

          <label className="field">
            <span>Company</span>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. EY"
              autoFocus
            />
          </label>

          <label className="field">
            <span>Role</span>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Data Analyst"
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Date applied</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Save changes' : 'Add application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
