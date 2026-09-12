import React, { useEffect, useMemo, useState } from 'react';
import AuthForm from './components/AuthForm.jsx';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  getDashboard,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  createDepartment,
  getAttendance,
  createAttendance,
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveRequestStatus,
  getPayroll,
  createPayroll,
  getRecruitment,
  createRecruitment,
  updateRecruitmentStatus,
} from './services/api.js';

const TABS = ['Dashboard', 'Employees', 'Departments', 'Attendance', 'Leave', 'Payroll', 'Recruitment'];

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatCard({ label, value, tone = 'primary' }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DepartmentBadge({ departmentId, departments }) {
  const department = departments.find((item) => item.id === departmentId);
  return <span className="badge">{department ? department.name : 'Unassigned'}</span>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [dashboard, setDashboard] = useState({ stats: {}, employees: [], departments: [], attendance: [], leaveRequests: [], jobs: [] });
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', role: '', departmentId: '', status: 'Active', location: 'Remote', phone: '', joiningDate: new Date().toISOString().slice(0, 10) });
  const [departmentForm, setDepartmentForm] = useState({ name: '', head: '', budget: 0, location: 'HQ' });
  const [attendanceForm, setAttendanceForm] = useState({ employeeId: '', date: new Date().toISOString().slice(0, 10), status: 'Present', checkIn: '09:00', checkOut: '17:00' });
  const [leaveForm, setLeaveForm] = useState({ employeeId: '', type: 'Annual', startDate: '', endDate: '', reason: '' });
  const [payrollForm, setPayrollForm] = useState({ employeeId: '', month: '', salary: 0, bonus: 0, deductions: 0, netPay: 0, status: 'Paid' });
  const [jobForm, setJobForm] = useState({ title: '', department: '', location: 'Remote', applicants: 0, status: 'Open' });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [dashboardData, employeesData, departmentsData, attendanceData, leaveData, payrollData, jobsData] = await Promise.all([
        getDashboard(),
        getEmployees(),
        getDepartments(),
        getAttendance(),
        getLeaveRequests(),
        getPayroll(),
        getRecruitment(),
      ]);

      setDashboard(dashboardData);
      setEmployees(employeesData);
      setDepartments(departmentsData);
      setAttendance(attendanceData);
      setLeaveRequests(leaveData);
      setPayroll(payrollData);
      setJobs(jobsData);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      const token = localStorage.getItem('jobtrack-token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const { user: currentUser } = await getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        localStorage.removeItem('jobtrack-token');
        setUser(null);
        setError('Your session expired. Please log in again.');
      }
    };

    bootstrapSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  const handleAuthSubmit = async ({ username, password }) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const authHandler = authMode === 'login' ? loginUser : registerUser;
      const { user: loggedInUser } = await authHandler({ username, password });
      setUser(loggedInUser);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setActiveTab('Dashboard');
  };

  const handleEmployeeSubmit = async (event) => {
    event.preventDefault();
    try {
      await createEmployee({ ...employeeForm, departmentId: Number(employeeForm.departmentId) || null });
      setEmployeeForm({ name: '', email: '', role: '', departmentId: '', status: 'Active', location: 'Remote', phone: '', joiningDate: new Date().toISOString().slice(0, 10) });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDepartmentSubmit = async (event) => {
    event.preventDefault();
    try {
      await createDepartment(departmentForm);
      setDepartmentForm({ name: '', head: '', budget: 0, location: 'HQ' });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAttendanceSubmit = async (event) => {
    event.preventDefault();
    try {
      await createAttendance({ ...attendanceForm, employeeId: Number(attendanceForm.employeeId) });
      setAttendanceForm({ employeeId: '', date: new Date().toISOString().slice(0, 10), status: 'Present', checkIn: '09:00', checkOut: '17:00' });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeaveSubmit = async (event) => {
    event.preventDefault();
    try {
      await createLeaveRequest({ ...leaveForm, employeeId: Number(leaveForm.employeeId) });
      setLeaveForm({ employeeId: '', type: 'Annual', startDate: '', endDate: '', reason: '' });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePayrollSubmit = async (event) => {
    event.preventDefault();
    try {
      await createPayroll({ ...payrollForm, employeeId: Number(payrollForm.employeeId), netPay: Number(payrollForm.salary) + Number(payrollForm.bonus) - Number(payrollForm.deductions) });
      setPayrollForm({ employeeId: '', month: '', salary: 0, bonus: 0, deductions: 0, netPay: 0, status: 'Paid' });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJobSubmit = async (event) => {
    event.preventDefault();
    try {
      await createRecruitment(jobForm);
      setJobForm({ title: '', department: '', location: 'Remote', applicants: 0, status: 'Open' });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const dashboardStats = useMemo(() => {
    return {
      totalEmployees: dashboard.stats.totalEmployees ?? 0,
      activeEmployees: dashboard.stats.activeEmployees ?? 0,
      departments: dashboard.stats.departments ?? 0,
      pendingLeaves: dashboard.stats.pendingLeaves ?? 0,
      openJobs: dashboard.stats.openJobs ?? 0,
      presentToday: dashboard.stats.presentToday ?? 0,
    };
  }, [dashboard]);

  if (!user) {
    return (
      <AuthForm
        mode={authMode}
        onSubmit={handleAuthSubmit}
        onToggleMode={() => setAuthMode((current) => current === 'login' ? 'register' : 'login')}
        loading={authLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="hrms-shell">
      <aside className="sidebar">
        <div className="brand-box">
          <span className="brand-mark">HR</span>
          <div>
            <h2>PeopleFlow</h2>
            <small>HRMS Suite</small>
          </div>
        </div>

        <nav className="nav-list">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div>
            <small>Signed in</small>
            <strong>{user.username}</strong>
          </div>
          <button className="btn btn-ghost btn-small" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operations overview</p>
            <h1>{activeTab}</h1>
          </div>
        </header>

        {error && (
          <div className="banner banner-error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError('')} aria-label="Dismiss error">✕</button>
          </div>
        )}

        {activeTab === 'Dashboard' && (
          <section className="content-block">
            <div className="stats-grid">
              <StatCard label="Total employees" value={dashboardStats.totalEmployees} tone="primary" />
              <StatCard label="Active" value={dashboardStats.activeEmployees} tone="success" />
              <StatCard label="Departments" value={dashboardStats.departments} tone="warning" />
              <StatCard label="Pending leave" value={dashboardStats.pendingLeaves} tone="danger" />
              <StatCard label="Open roles" value={dashboardStats.openJobs} tone="info" />
              <StatCard label="Present today" value={dashboardStats.presentToday} tone="neutral" />
            </div>

            <div className="panel-grid">
              <div className="panel-box">
                <h3>Recent employees</h3>
                <ul className="list">
                  {employees.slice(0, 5).map((employee) => (
                    <li key={employee.id}>
                      <div>
                        <strong>{employee.name}</strong>
                        <small>{employee.role}</small>
                      </div>
                      <DepartmentBadge departmentId={employee.departmentId} departments={departments} />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel-box">
                <h3>Leave requests</h3>
                <ul className="list">
                  {leaveRequests.slice(0, 5).map((request) => (
                    <li key={request.id}>
                      <div>
                        <strong>{request.type}</strong>
                        <small>{formatDate(request.startDate)} - {formatDate(request.endDate)}</small>
                      </div>
                      <span className={`tag tag-${request.status.toLowerCase()}`}>{request.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Employees' && (
          <section className="content-block">
            <div className="two-column">
              <form className="form-card" onSubmit={handleEmployeeSubmit}>
                <h3>Add employee</h3>
                <div className="field-grid">
                  <label><span>Name</span><input value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} /></label>
                  <label><span>Email</span><input type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} /></label>
                  <label><span>Role</span><input value={employeeForm.role} onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })} /></label>
                  <label><span>Phone</span><input value={employeeForm.phone} onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })} /></label>
                  <label><span>Department</span>
                    <select value={employeeForm.departmentId} onChange={(e) => setEmployeeForm({ ...employeeForm, departmentId: e.target.value })}>
                      <option value="">Select department</option>
                      {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                    </select>
                  </label>
                  <label><span>Status</span>
                    <select value={employeeForm.status} onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Probation">Probation</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>
                  <label><span>Location</span><input value={employeeForm.location} onChange={(e) => setEmployeeForm({ ...employeeForm, location: e.target.value })} /></label>
                  <label><span>Joining date</span><input type="date" value={employeeForm.joiningDate} onChange={(e) => setEmployeeForm({ ...employeeForm, joiningDate: e.target.value })} /></label>
                </div>
                <button className="btn btn-primary" type="submit">Save employee</button>
              </form>

              <div className="panel-box">
                <h3>Employee directory</h3>
                <table>
                  <thead>
                    <tr><th>Name</th><th>Role</th><th>Status</th><th>Department</th></tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id}>
                        <td>{employee.name}</td>
                        <td>{employee.role}</td>
                        <td><span className={`tag tag-${employee.status.toLowerCase().replace(/\s+/g, '-')}`}>{employee.status}</span></td>
                        <td><DepartmentBadge departmentId={employee.departmentId} departments={departments} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Departments' && (
          <section className="content-block">
            <div className="two-column">
              <form className="form-card" onSubmit={handleDepartmentSubmit}>
                <h3>Create department</h3>
                <div className="field-grid">
                  <label><span>Department name</span><input value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} /></label>
                  <label><span>Department head</span><input value={departmentForm.head} onChange={(e) => setDepartmentForm({ ...departmentForm, head: e.target.value })} /></label>
                  <label><span>Budget</span><input type="number" value={departmentForm.budget} onChange={(e) => setDepartmentForm({ ...departmentForm, budget: Number(e.target.value) })} /></label>
                  <label><span>Location</span><input value={departmentForm.location} onChange={(e) => setDepartmentForm({ ...departmentForm, location: e.target.value })} /></label>
                </div>
                <button className="btn btn-primary" type="submit">Create department</button>
              </form>

              <div className="panel-box">
                <h3>Departments</h3>
                <ul className="list">
                  {departments.map((department) => (
                    <li key={department.id}>
                      <div>
                        <strong>{department.name}</strong>
                        <small>{department.head}</small>
                      </div>
                      <span className="badge">${Number(department.budget).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Attendance' && (
          <section className="content-block">
            <div className="two-column">
              <form className="form-card" onSubmit={handleAttendanceSubmit}>
                <h3>Mark attendance</h3>
                <div className="field-grid">
                  <label><span>Employee</span>
                    <select value={attendanceForm.employeeId} onChange={(e) => setAttendanceForm({ ...attendanceForm, employeeId: e.target.value })}>
                      <option value="">Select employee</option>
                      {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                    </select>
                  </label>
                  <label><span>Date</span><input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })} /></label>
                  <label><span>Status</span>
                    <select value={attendanceForm.status} onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}>
                      <option value="Present">Present</option>
                      <option value="Late">Late</option>
                      <option value="Absent">Absent</option>
                      <option value="Leave">Leave</option>
                    </select>
                  </label>
                  <label><span>Check-in</span><input value={attendanceForm.checkIn} onChange={(e) => setAttendanceForm({ ...attendanceForm, checkIn: e.target.value })} /></label>
                  <label><span>Check-out</span><input value={attendanceForm.checkOut} onChange={(e) => setAttendanceForm({ ...attendanceForm, checkOut: e.target.value })} /></label>
                </div>
                <button className="btn btn-primary" type="submit">Submit attendance</button>
              </form>

              <div className="panel-box">
                <h3>Today’s attendance</h3>
                <table>
                  <thead>
                    <tr><th>Employee</th><th>Status</th><th>In</th><th>Out</th></tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => {
                      const employee = employees.find((item) => item.id === record.employeeId);
                      return (
                        <tr key={record.id}>
                          <td>{employee ? employee.name : 'Unknown'}</td>
                          <td><span className={`tag tag-${record.status.toLowerCase()}`}>{record.status}</span></td>
                          <td>{record.checkIn}</td>
                          <td>{record.checkOut}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Leave' && (
          <section className="content-block">
            <div className="two-column">
              <form className="form-card" onSubmit={handleLeaveSubmit}>
                <h3>Request leave</h3>
                <div className="field-grid">
                  <label><span>Employee</span>
                    <select value={leaveForm.employeeId} onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}>
                      <option value="">Select employee</option>
                      {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                    </select>
                  </label>
                  <label><span>Type</span>
                    <select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                      <option value="Annual">Annual</option>
                      <option value="Sick">Sick</option>
                      <option value="Personal">Personal</option>
                    </select>
                  </label>
                  <label><span>Start date</span><input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></label>
                  <label><span>End date</span><input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></label>
                  <label className="full-width"><span>Reason</span><textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} rows="3" /></label>
                </div>
                <button className="btn btn-primary" type="submit">Submit request</button>
              </form>

              <div className="panel-box">
                <h3>Leave tracker</h3>
                <table>
                  <thead>
                    <tr><th>Employee</th><th>Type</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((request) => {
                      const employee = employees.find((item) => item.id === request.employeeId);
                      return (
                        <tr key={request.id}>
                          <td>{employee ? employee.name : 'Unknown'}</td>
                          <td>{request.type}</td>
                          <td>
                            <button className="btn btn-ghost btn-small" onClick={() => updateLeaveRequestStatus(request.id, request.status === 'Approved' ? 'Pending' : 'Approved')}>
                              {request.status}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Payroll' && (
          <section className="content-block">
            <div className="two-column">
              <form className="form-card" onSubmit={handlePayrollSubmit}>
                <h3>Payroll entry</h3>
                <div className="field-grid">
                  <label><span>Employee</span>
                    <select value={payrollForm.employeeId} onChange={(e) => setPayrollForm({ ...payrollForm, employeeId: e.target.value })}>
                      <option value="">Select employee</option>
                      {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                    </select>
                  </label>
                  <label><span>Month</span><input value={payrollForm.month} onChange={(e) => setPayrollForm({ ...payrollForm, month: e.target.value })} placeholder="August 2026" /></label>
                  <label><span>Salary</span><input type="number" value={payrollForm.salary} onChange={(e) => setPayrollForm({ ...payrollForm, salary: Number(e.target.value) })} /></label>
                  <label><span>Bonus</span><input type="number" value={payrollForm.bonus} onChange={(e) => setPayrollForm({ ...payrollForm, bonus: Number(e.target.value) })} /></label>
                  <label><span>Deductions</span><input type="number" value={payrollForm.deductions} onChange={(e) => setPayrollForm({ ...payrollForm, deductions: Number(e.target.value) })} /></label>
                  <label><span>Status</span>
                    <select value={payrollForm.status} onChange={(e) => setPayrollForm({ ...payrollForm, status: e.target.value })}>
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </label>
                </div>
                <button className="btn btn-primary" type="submit">Record payroll</button>
              </form>

              <div className="panel-box">
                <h3>Payroll summary</h3>
                <table>
                  <thead>
                    <tr><th>Employee</th><th>Month</th><th>Net pay</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {payroll.map((item) => {
                      const employee = employees.find((emp) => emp.id === item.employeeId);
                      return (
                        <tr key={item.id}>
                          <td>{employee ? employee.name : 'Unknown'}</td>
                          <td>{item.month}</td>
                          <td>${Number(item.netPay).toLocaleString()}</td>
                          <td>{item.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Recruitment' && (
          <section className="content-block">
            <div className="two-column">
              <form className="form-card" onSubmit={handleJobSubmit}>
                <h3>Post new role</h3>
                <div className="field-grid">
                  <label><span>Job title</span><input value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} /></label>
                  <label><span>Department</span><input value={jobForm.department} onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })} /></label>
                  <label><span>Location</span><input value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })} /></label>
                  <label><span>Applicants</span><input type="number" value={jobForm.applicants} onChange={(e) => setJobForm({ ...jobForm, applicants: Number(e.target.value) })} /></label>
                  <label><span>Status</span>
                    <select value={jobForm.status} onChange={(e) => setJobForm({ ...jobForm, status: e.target.value })}>
                      <option value="Open">Open</option>
                      <option value="In Review">In Review</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </label>
                </div>
                <button className="btn btn-primary" type="submit">Create opening</button>
              </form>

              <div className="panel-box">
                <h3>Hiring pipeline</h3>
                <table>
                  <thead>
                    <tr><th>Role</th><th>Department</th><th>Applicants</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id}>
                        <td>{job.title}</td>
                        <td>{job.department}</td>
                        <td>{job.applicants}</td>
                        <td>
                          <button className="btn btn-ghost btn-small" onClick={() => updateRecruitmentStatus(job.id, job.status === 'Open' ? 'In Review' : 'Open')}>
                            {job.status}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
