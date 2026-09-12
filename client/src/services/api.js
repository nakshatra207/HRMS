const BASE_URL = '/api';

function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem('jobtrack-token');
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function registerUser({ username, password }) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handleResponse(res);
  localStorage.setItem('jobtrack-token', data.token);
  return data;
}

export async function loginUser({ username, password }) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handleResponse(res);
  localStorage.setItem('jobtrack-token', data.token);
  return data;
}

export async function logoutUser() {
  localStorage.removeItem('jobtrack-token');
}

export async function getCurrentUser() {
  const res = await fetch(`${BASE_URL}/auth/me`, { headers: getAuthHeaders() });
  return handleResponse(res);
}

export async function getDashboard() {
  const res = await fetch(`${BASE_URL}/dashboard`, { headers: getAuthHeaders() });
  return handleResponse(res);
}

export async function getEmployees() {
  const res = await fetch(`${BASE_URL}/employees`, { headers: getAuthHeaders() });
  return handleResponse(res);
}

export async function createEmployee(data) {
  const res = await fetch(`${BASE_URL}/employees`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateEmployee(id, data) {
  const res = await fetch(`${BASE_URL}/employees/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteEmployee(id) {
  const res = await fetch(`${BASE_URL}/employees/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function getDepartments() {
  const res = await fetch(`${BASE_URL}/departments`, { headers: getAuthHeaders() });
  return handleResponse(res);
}

export async function createDepartment(data) {
  const res = await fetch(`${BASE_URL}/departments`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getAttendance(date = '') {
  const endpoint = date ? `${BASE_URL}/attendance?date=${encodeURIComponent(date)}` : `${BASE_URL}/attendance`;
  const res = await fetch(endpoint, { headers: getAuthHeaders() });
  return handleResponse(res);
}

export async function createAttendance(data) {
  const res = await fetch(`${BASE_URL}/attendance`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getLeaveRequests() {
  const res = await fetch(`${BASE_URL}/leave-requests`, { headers: getAuthHeaders() });
  return handleResponse(res);
}

export async function createLeaveRequest(data) {
  const res = await fetch(`${BASE_URL}/leave-requests`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateLeaveRequestStatus(id, status) {
  const res = await fetch(`${BASE_URL}/leave-requests/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

export async function getPayroll() {
  const res = await fetch(`${BASE_URL}/payroll`, { headers: getAuthHeaders() });
  return handleResponse(res);
}

export async function createPayroll(data) {
  const res = await fetch(`${BASE_URL}/payroll`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getRecruitment() {
  const res = await fetch(`${BASE_URL}/recruitment`, { headers: getAuthHeaders() });
  return handleResponse(res);
}

export async function createRecruitment(data) {
  const res = await fetch(`${BASE_URL}/recruitment`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateRecruitmentStatus(id, status) {
  const res = await fetch(`${BASE_URL}/recruitment/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}
