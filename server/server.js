const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'applications.json');

app.use(cors());
app.use(express.json());

// ---------- Helpers ----------

function readApplications() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    // If file doesn't exist or is invalid, start fresh
    return [];
  }
}

function writeApplications(applications) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(applications, null, 2), 'utf-8');
}

function getNextId(applications) {
  if (applications.length === 0) return 1;
  return Math.max(...applications.map((a) => a.id)) + 1;
}

const VALID_STATUSES = ['Applied', 'Interview', 'Selected', 'Rejected'];

// ---------- Routes ----------

// GET /api/applications - list all (supports optional ?search= & ?status= query params)
app.get('/api/applications', (req, res) => {
  let applications = readApplications();
  const { search, status } = req.query;

  if (status && status !== 'All') {
    applications = applications.filter((a) => a.status === status);
  }

  if (search) {
    const term = search.toLowerCase();
    applications = applications.filter(
      (a) =>
        a.company.toLowerCase().includes(term) ||
        a.role.toLowerCase().includes(term)
    );
  }

  // Most recent first
  applications.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(applications);
});

// POST /api/applications - add new application
app.post('/api/applications', (req, res) => {
  const { company, role, status, date } = req.body;

  if (!company || !role || !date) {
    return res.status(400).json({ error: 'company, role and date are required' });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const applications = readApplications();
  const newApplication = {
    id: getNextId(applications),
    company: company.trim(),
    role: role.trim(),
    status: status || 'Applied',
    date,
  };

  applications.push(newApplication);
  writeApplications(applications);

  res.status(201).json(newApplication);
});

// PUT /api/applications/:id - edit application (also used for status change)
app.put('/api/applications/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const applications = readApplications();
  const index = applications.findIndex((a) => a.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { company, role, status, date } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const existing = applications[index];
  const updated = {
    ...existing,
    company: company !== undefined ? company.trim() : existing.company,
    role: role !== undefined ? role.trim() : existing.role,
    status: status !== undefined ? status : existing.status,
    date: date !== undefined ? date : existing.date,
  };

  applications[index] = updated;
  writeApplications(applications);

  res.json(updated);
});

// DELETE /api/applications/:id - remove application
app.delete('/api/applications/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const applications = readApplications();
  const index = applications.findIndex((a) => a.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const [removed] = applications.splice(index, 1);
  writeApplications(applications);

  res.json(removed);
});

// GET /api/stats - dashboard statistics
app.get('/api/stats', (req, res) => {
  const applications = readApplications();

  const stats = {
    total: applications.length,
    Applied: 0,
    Interview: 0,
    Selected: 0,
    Rejected: 0,
  };

  applications.forEach((a) => {
    if (stats[a.status] !== undefined) {
      stats[a.status] += 1;
    }
  });

  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`JobTrack server running on http://localhost:${PORT}`);
});
