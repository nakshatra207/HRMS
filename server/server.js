const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  readUsers,
  writeUsers,
  readEmployees,
  writeEmployees,
  readDepartments,
  writeDepartments,
  readAttendance,
  writeAttendance,
  readLeaveRequests,
  writeLeaveRequests,
  readPayroll,
  writePayroll,
  readRecruitment,
  writeRecruitment,
} = require('./db');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'jobtrack-dev-secret-change-me';

app.use(cors());
app.use(express.json());

const VALID_STATUS_VALUES = ['Active', 'Inactive', 'On Leave', 'Probation'];
const VALID_ATTENDANCE = ['Present', 'Late', 'Absent', 'Leave'];
const VALID_LEAVE = ['Pending', 'Approved', 'Rejected'];
const VALID_JOB_STATUS = ['Open', 'In Review', 'Closed'];

function getNextId(items) {
  if (!items.length) return 1;
  return Math.max(...items.map((item) => item.id)) + 1;
}

function sanitizeText(value, field, { minLength = 1, maxLength = 100 } = {}) {
  if (typeof value !== 'string') throw new Error(`${field} must be a string.`);
  const trimmed = value.trim();
  if (trimmed.length < minLength) throw new Error(`${field} is required.`);
  if (trimmed.length > maxLength) throw new Error(`${field} must be ${maxLength} characters or fewer.`);
  return trimmed;
}

function validateDate(value) {
  if (!value || typeof value !== 'string') throw new Error('date is required.');
  const date = new Date(value);
  const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime());
  if (!isIsoDate) throw new Error('date must be a valid YYYY-MM-DD value.');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(value + 'T00:00:00');
  if (inputDate > today) throw new Error('date cannot be in the future.');
  return value;
}

function normalizeRole(value) {
  const allowed = ['admin', 'manager', 'hr', 'employee'];
  const role = String(value || 'admin').trim().toLowerCase();
  return allowed.includes(role) ? role : 'admin';
}

function createToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role || 'admin' }, JWT_SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

app.post('/api/auth/register', (req, res) => {
  const { username, password, role } = req.body || {};
  let safeUsername;
  let safePassword;
  let safeRole;

  try {
    safeUsername = sanitizeText(username, 'username', { minLength: 3, maxLength: 20 });
    if (!/^[a-zA-Z0-9_-]+$/.test(safeUsername)) throw new Error('username can only contain letters, numbers, underscores, or dashes.');

    safePassword = sanitizeText(password, 'password', { minLength: 8, maxLength: 128 });
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(safePassword)) {
      throw new Error('password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.');
    }

    safeRole = normalizeRole(role);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const users = readUsers();
  const alreadyExists = users.some((user) => user.username.toLowerCase() === safeUsername.toLowerCase());
  if (alreadyExists) return res.status(409).json({ error: 'Username already exists.' });

  const user = {
    id: getNextId(users),
    username: safeUsername,
    passwordHash: bcrypt.hashSync(safePassword, 10),
    role: safeRole,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeUsers(users);

  return res.status(201).json({ user: { id: user.id, username: user.username, role: user.role }, token: createToken(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password are required.' });

  const users = readUsers();
  const user = users.find((entry) => entry.username.toLowerCase() === String(username).trim().toLowerCase());
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  return res.json({ user: { id: user.id, username: user.username, role: user.role || 'admin' }, token: createToken(user) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const users = readUsers();
  const user = users.find((entry) => entry.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user: { id: user.id, username: user.username, role: user.role || 'admin' } });
});

function withUserScope(items, userId) {
  return items.filter((item) => item.userId === userId);
}

app.get('/api/dashboard', requireAuth, (req, res) => {
  const employees = withUserScope(readEmployees(), req.user.id);
  const departments = withUserScope(readDepartments(), req.user.id);
  const attendance = withUserScope(readAttendance(), req.user.id);
  const leaveRequests = withUserScope(readLeaveRequests(), req.user.id);
  const jobs = withUserScope(readRecruitment(), req.user.id);

  const stats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter((emp) => emp.status === 'Active').length,
    departments: departments.length,
    pendingLeaves: leaveRequests.filter((item) => item.status === 'Pending').length,
    openJobs: jobs.filter((job) => job.status === 'Open').length,
    presentToday: attendance.filter((item) => item.date === new Date().toISOString().slice(0, 10) && item.status === 'Present').length,
  };

  res.json({ stats, employees, departments, attendance, leaveRequests, jobs, role: req.user.role || 'admin' });
});

app.get('/api/analytics', requireAuth, (req, res) => {
  const employees = withUserScope(readEmployees(), req.user.id);
  const departments = withUserScope(readDepartments(), req.user.id);
  const attendance = withUserScope(readAttendance(), req.user.id);
  const leaveRequests = withUserScope(readLeaveRequests(), req.user.id);
  const payroll = withUserScope(readPayroll(), req.user.id);
  const jobs = withUserScope(readRecruitment(), req.user.id);

  const summary = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter((emp) => emp.status === 'Active').length,
    departments: departments.length,
    pendingLeaves: leaveRequests.filter((item) => item.status === 'Pending').length,
    openJobs: jobs.filter((job) => job.status === 'Open').length,
    presentToday: attendance.filter((item) => item.date === new Date().toISOString().slice(0, 10) && item.status === 'Present').length,
    monthlyPayroll: payroll.reduce((sum, item) => sum + Number(item.netPay || 0), 0),
  };

  const roleBreakdown = employees.reduce((acc, employee) => {
    acc[employee.role] = (acc[employee.role] || 0) + 1;
    return acc;
  }, {});

  res.json({
    role: req.user.role || 'admin',
    summary,
    roleBreakdown,
    recentLeave: leaveRequests.slice(0, 5),
    hiringPipeline: jobs.slice(0, 5),
  });
});

app.get('/api/employees', requireAuth, (req, res) => {
  const employees = withUserScope(readEmployees(), req.user.id);
  employees.sort((a, b) => a.name.localeCompare(b.name));
  res.json(employees);
});

app.post('/api/employees', requireAuth, (req, res) => {
  try {
    const payload = req.body || {};
    const employee = {
      id: getNextId(readEmployees()),
      userId: req.user.id,
      employeeId: sanitizeText(payload.employeeId || `EMP-${Date.now()}`, 'employeeId', { minLength: 2, maxLength: 30 }),
      name: sanitizeText(payload.name, 'name', { minLength: 2, maxLength: 80 }),
      email: sanitizeText(payload.email, 'email', { minLength: 5, maxLength: 100 }),
      phone: sanitizeText(payload.phone || '', 'phone', { minLength: 0, maxLength: 30 }),
      role: sanitizeText(payload.role, 'role', { minLength: 2, maxLength: 80 }),
      departmentId: Number(payload.departmentId) || null,
      status: VALID_STATUS_VALUES.includes(payload.status) ? payload.status : 'Active',
      joiningDate: validateDate(payload.joiningDate || new Date().toISOString().slice(0, 10)),
      location: sanitizeText(payload.location || 'Remote', 'location', { minLength: 2, maxLength: 60 }),
      createdAt: new Date().toISOString(),
    };

    const employees = readEmployees();
    employees.push(employee);
    writeEmployees(employees);
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/employees/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const employees = readEmployees();
  const index = employees.findIndex((item) => item.id === id && item.userId === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Employee not found.' });

  try {
    const current = employees[index];
    const payload = req.body || {};
    const updated = {
      ...current,
      employeeId: payload.employeeId ? sanitizeText(payload.employeeId, 'employeeId', { minLength: 2, maxLength: 30 }) : current.employeeId,
      name: payload.name ? sanitizeText(payload.name, 'name', { minLength: 2, maxLength: 80 }) : current.name,
      email: payload.email ? sanitizeText(payload.email, 'email', { minLength: 5, maxLength: 100 }) : current.email,
      phone: payload.phone !== undefined ? sanitizeText(payload.phone, 'phone', { minLength: 0, maxLength: 30 }) : current.phone,
      role: payload.role ? sanitizeText(payload.role, 'role', { minLength: 2, maxLength: 80 }) : current.role,
      departmentId: payload.departmentId !== undefined ? Number(payload.departmentId) || null : current.departmentId,
      status: VALID_STATUS_VALUES.includes(payload.status) ? payload.status : current.status,
      joiningDate: payload.joiningDate ? validateDate(payload.joiningDate) : current.joiningDate,
      location: payload.location ? sanitizeText(payload.location, 'location', { minLength: 2, maxLength: 60 }) : current.location,
    };

    employees[index] = updated;
    writeEmployees(employees);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/employees/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const employees = readEmployees();
  const index = employees.findIndex((item) => item.id === id && item.userId === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Employee not found.' });
  const [removed] = employees.splice(index, 1);
  writeEmployees(employees);
  res.json(removed);
});

app.get('/api/departments', requireAuth, (req, res) => {
  const departments = withUserScope(readDepartments(), req.user.id);
  departments.sort((a, b) => a.name.localeCompare(b.name));
  res.json(departments);
});

app.post('/api/departments', requireAuth, (req, res) => {
  try {
    const payload = req.body || {};
    const department = {
      id: getNextId(readDepartments()),
      userId: req.user.id,
      name: sanitizeText(payload.name, 'name', { minLength: 2, maxLength: 60 }),
      head: sanitizeText(payload.head || 'Unassigned', 'head', { minLength: 2, maxLength: 80 }),
      budget: Number(payload.budget) || 0,
      location: sanitizeText(payload.location || 'HQ', 'location', { minLength: 2, maxLength: 60 }),
    };

    const departments = readDepartments();
    departments.push(department);
    writeDepartments(departments);
    res.status(201).json(department);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/attendance', requireAuth, (req, res) => {
  const { date } = req.query;
  const attendance = withUserScope(readAttendance(), req.user.id).filter((item) => !date || item.date === date);
  attendance.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(attendance);
});

app.post('/api/attendance', requireAuth, (req, res) => {
  try {
    const payload = req.body || {};
    const entry = {
      id: getNextId(readAttendance()),
      userId: req.user.id,
      employeeId: Number(payload.employeeId),
      date: validateDate(payload.date || new Date().toISOString().slice(0, 10)),
      status: VALID_ATTENDANCE.includes(payload.status) ? payload.status : 'Present',
      checkIn: payload.checkIn || '09:00',
      checkOut: payload.checkOut || '17:00',
    };

    const attendance = readAttendance();
    attendance.push(entry);
    writeAttendance(attendance);
    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/leave-requests', requireAuth, (req, res) => {
  const leaveRequests = withUserScope(readLeaveRequests(), req.user.id);
  leaveRequests.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  res.json(leaveRequests);
});

app.post('/api/leave-requests', requireAuth, (req, res) => {
  try {
    const payload = req.body || {};
    const leaveRequest = {
      id: getNextId(readLeaveRequests()),
      userId: req.user.id,
      employeeId: Number(payload.employeeId),
      type: sanitizeText(payload.type || 'Annual', 'type', { minLength: 2, maxLength: 40 }),
      startDate: validateDate(payload.startDate),
      endDate: validateDate(payload.endDate),
      reason: sanitizeText(payload.reason || 'Personal', 'reason', { minLength: 2, maxLength: 200 }),
      status: VALID_LEAVE.includes(payload.status) ? payload.status : 'Pending',
    };

    const leaveRequests = readLeaveRequests();
    leaveRequests.push(leaveRequest);
    writeLeaveRequests(leaveRequests);
    res.status(201).json(leaveRequest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/leave-requests/:id', requireAuth, (req, res) => {
  const leaveRequests = readLeaveRequests();
  const index = leaveRequests.findIndex((item) => item.id === Number(req.params.id) && item.userId === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Leave request not found.' });

  const nextStatus = req.body?.status;
  if (!VALID_LEAVE.includes(nextStatus)) return res.status(400).json({ error: 'status must be Pending, Approved, or Rejected.' });

  leaveRequests[index].status = nextStatus;
  writeLeaveRequests(leaveRequests);
  res.json(leaveRequests[index]);
});

app.get('/api/payroll', requireAuth, (req, res) => {
  const payroll = withUserScope(readPayroll(), req.user.id);
  res.json(payroll);
});

app.post('/api/payroll', requireAuth, (req, res) => {
  try {
    const payload = req.body || {};
    const item = {
      id: getNextId(readPayroll()),
      userId: req.user.id,
      employeeId: Number(payload.employeeId),
      month: sanitizeText(payload.month, 'month', { minLength: 2, maxLength: 20 }),
      salary: Number(payload.salary) || 0,
      bonus: Number(payload.bonus) || 0,
      deductions: Number(payload.deductions) || 0,
      netPay: Number(payload.netPay) || 0,
      status: payload.status || 'Paid',
    };

    const payroll = readPayroll();
    payroll.push(item);
    writePayroll(payroll);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/recruitment', requireAuth, (req, res) => {
  const jobs = withUserScope(readRecruitment(), req.user.id);
  jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(jobs);
});

app.post('/api/recruitment', requireAuth, (req, res) => {
  try {
    const payload = req.body || {};
    const job = {
      id: getNextId(readRecruitment()),
      userId: req.user.id,
      title: sanitizeText(payload.title, 'title', { minLength: 2, maxLength: 80 }),
      department: sanitizeText(payload.department || 'General', 'department', { minLength: 2, maxLength: 80 }),
      location: sanitizeText(payload.location || 'Remote', 'location', { minLength: 2, maxLength: 60 }),
      applicants: Number(payload.applicants) || 0,
      status: VALID_JOB_STATUS.includes(payload.status) ? payload.status : 'Open',
      createdAt: new Date().toISOString(),
    };

    const jobs = readRecruitment();
    jobs.push(job);
    writeRecruitment(jobs);
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/recruitment/:id', requireAuth, (req, res) => {
  const jobs = readRecruitment();
  const index = jobs.findIndex((item) => item.id === Number(req.params.id) && item.userId === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Job opening not found.' });

  const nextStatus = req.body?.status;
  if (!VALID_JOB_STATUS.includes(nextStatus)) return res.status(400).json({ error: 'status must be Open, In Review, or Closed.' });

  jobs[index].status = nextStatus;
  writeRecruitment(jobs);
  res.json(jobs[index]);
});

app.listen(PORT, () => {
  console.log(`JobTrack server running on http://localhost:${PORT}`);
});
