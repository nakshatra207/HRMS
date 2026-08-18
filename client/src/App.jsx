import React, { useEffect, useState, useCallback } from 'react';
import Dashboard from './components/Dashboard.jsx';
import ApplicationForm from './components/ApplicationForm.jsx';
import ApplicationList from './components/ApplicationList.jsx';
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  getStats,
} from './services/api.js';

const STATUS_OPTIONS = ['Applied', 'Interview', 'Selected', 'Rejected'];

export default function App() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, Applied: 0, Interview: 0, Selected: 0, Rejected: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadApplications = useCallback(async () => {
    try {
      const data = await getApplications({ search, status: statusFilter });
      setApplications(data);
    } catch (err) {
      setError(err.message);
    }
  }, [search, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadApplications(), loadStats()]);
    setLoading(false);
  }, [loadApplications, loadStats]);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadApplications();
  }, [search, statusFilter, loadApplications]);

  const handleAddClick = () => {
    setEditingApplication(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (application) => {
    setEditingApplication(application);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingApplication(null);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingApplication) {
        await updateApplication(editingApplication.id, formData);
      } else {
        await createApplication(formData);
      }
      await Promise.all([loadApplications(), loadStats()]);
      handleFormClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteApplication(id);
      await Promise.all([loadApplications(), loadStats()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateApplication(id, { status });
      await Promise.all([loadApplications(), loadStats()]);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">JT</span>
          <div className="brand-text">
            <h1>JobTrack</h1>
            <p>Ledger for job applications</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="banner banner-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss error">✕</button>
        </div>
      )}

      <main className="app-main">
        <Dashboard stats={stats} />

        <section className="toolbar">
          <button className="btn btn-primary" onClick={handleAddClick}>
            + Add Application
          </button>

          <div className="toolbar-filters">
            <input
              type="text"
              className="search-input"
              placeholder="Search company or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </section>

        <ApplicationList
          applications={applications}
          loading={loading}
          statusOptions={STATUS_OPTIONS}
          onEdit={handleEditClick}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      </main>

      {isFormOpen && (
        <ApplicationForm
          initialData={editingApplication}
          statusOptions={STATUS_OPTIONS}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
