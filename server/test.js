const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');

const serverPath = path.join(__dirname, 'server.js');

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function uniqueUsername(prefix) {
  return `${prefix}${crypto.randomBytes(4).toString('hex')}`;
}

function startServer(port) {
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: String(port) },
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return new Promise((resolve, reject) => {
    const stdout = [];
    const stderr = [];

    const onData = (chunk) => {
      const text = chunk.toString();
      stdout.push(text);
      if (text.includes('JobTrack server running')) {
        resolve({ child, stdout, stderr });
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', (chunk) => {
      stderr.push(chunk.toString());
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`Server exited early with code ${code}. stdout: ${stdout.join('')} stderr: ${stderr.join('')}`));
      }
    });
  });
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  return { status: res.status, data };
}

test('register and login flow works, and protected HRMS routes require auth', async (t) => {
  const PORT = await getAvailablePort();
  const { child } = await startServer(PORT);
  t.after(() => {
    child.kill('SIGTERM');
  });

  const username = uniqueUsername('alice');

  const registerRes = await fetchJson(`http://localhost:${PORT}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'StrongPass123!' }),
  });

  assert.equal(registerRes.status, 201, `Expected 201 from register, got ${registerRes.status}: ${JSON.stringify(registerRes.data)}`);
  assert.equal(registerRes.data.user.username, username);

  const loginRes = await fetchJson(`http://localhost:${PORT}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'StrongPass123!' }),
  });

  assert.equal(loginRes.status, 200, `Expected 200 from login, got ${loginRes.status}: ${JSON.stringify(loginRes.data)}`);
  assert.ok(loginRes.data.token, 'Token should be returned on login');

  const protectedRes = await fetchJson(`http://localhost:${PORT}/api/dashboard`, {
    headers: { Authorization: `Bearer ${loginRes.data.token}` },
  });

  assert.equal(protectedRes.status, 200, `Expected 200 from dashboard, got ${protectedRes.status}: ${JSON.stringify(protectedRes.data)}`);

  const invalidEmployeeRes = await fetchJson(`http://localhost:${PORT}/api/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginRes.data.token}`,
    },
    body: JSON.stringify({ name: '', email: '', role: '', status: 'Invalid', joiningDate: 'bad-date' }),
  });

  assert.equal(invalidEmployeeRes.status, 400, `Expected 400 from invalid employee payload, got ${invalidEmployeeRes.status}: ${JSON.stringify(invalidEmployeeRes.data)}`);

  const noAuthRes = await fetchJson(`http://localhost:${PORT}/api/dashboard`);
  assert.equal(noAuthRes.status, 401, `Expected 401 without auth, got ${noAuthRes.status}: ${JSON.stringify(noAuthRes.data)}`);
});

test('users only see their own HR data', async (t) => {
  const PORT = await getAvailablePort();
  const { child } = await startServer(PORT);
  t.after(() => child.kill('SIGTERM'));

  const firstUsername = uniqueUsername('hradmin');
  const secondUsername = uniqueUsername('hradmin');

  const firstUser = await fetchJson(`http://localhost:${PORT}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: firstUsername, password: 'StrongPass123!' }),
  });

  const secondUser = await fetchJson(`http://localhost:${PORT}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: secondUsername, password: 'StrongPass123!' }),
  });

  const firstToken = firstUser.data.token;
  const secondToken = secondUser.data.token;

  const firstEmployee = await fetchJson(`http://localhost:${PORT}/api/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firstToken}` },
    body: JSON.stringify({ name: 'Alice Manager', email: 'alice@company.com', role: 'Manager', status: 'Active', joiningDate: '2024-01-15' }),
  });

  await fetchJson(`http://localhost:${PORT}/api/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secondToken}` },
    body: JSON.stringify({ name: 'Bob Manager', email: 'bob@company.com', role: 'Manager', status: 'Active', joiningDate: '2024-02-15' }),
  });

  const firstDashboard = await fetchJson(`http://localhost:${PORT}/api/dashboard`, {
    headers: { Authorization: `Bearer ${firstToken}` },
  });

  const secondDashboard = await fetchJson(`http://localhost:${PORT}/api/dashboard`, {
    headers: { Authorization: `Bearer ${secondToken}` },
  });

  assert.equal(firstDashboard.status, 200);
  assert.equal(secondDashboard.status, 200);
  assert.equal(firstDashboard.data.employees.length, 1);
  assert.equal(secondDashboard.data.employees.length, 1);
  assert.equal(firstDashboard.data.employees[0].name, 'Alice Manager');
  assert.equal(secondDashboard.data.employees[0].name, 'Bob Manager');
  assert.notEqual(firstEmployee.status, 500);
});

test('analytics and user role metadata are available to authenticated users', async (t) => {
  const PORT = await getAvailablePort();
  const { child } = await startServer(PORT);
  t.after(() => child.kill('SIGTERM'));

  const username = uniqueUsername('analytics');
  const registerRes = await fetchJson(`http://localhost:${PORT}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'StrongPass123!', role: 'admin' }),
  });

  const analyticsRes = await fetchJson(`http://localhost:${PORT}/api/analytics`, {
    headers: { Authorization: `Bearer ${registerRes.data.token}` },
  });

  assert.equal(registerRes.status, 201);
  assert.equal(analyticsRes.status, 200);
  assert.equal(analyticsRes.data.role, 'admin');
  assert.ok(analyticsRes.data.summary.totalEmployees >= 0);
});
