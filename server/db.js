const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'hrms.sqlite');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initDatabase() {
  ensureDataDir();
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leaveRequests (
      id INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recruitment (
      id INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL,
      data TEXT NOT NULL
    );
  `);

  const userColumns = db.prepare('PRAGMA table_info(users)').all();
  const hasRoleColumn = userColumns.some((column) => column.name === 'role');
  if (!hasRoleColumn) {
    db.exec('ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT "admin"');
  }

  return db;
}

const db = initDatabase();

function readUsers() {
  return db.prepare('SELECT id, username, passwordHash, role, createdAt FROM users ORDER BY id ASC').all();
}

function writeUsers(users) {
  const deleteStmt = db.prepare('DELETE FROM users');
  const insertStmt = db.prepare('INSERT INTO users (id, username, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)');
  const transaction = db.transaction((items) => {
    deleteStmt.run();
    for (const item of items) {
      insertStmt.run(item.id, item.username, item.passwordHash, item.role || 'admin', item.createdAt);
    }
  });
  transaction(users);
}

function readCollection(tableName, userId = null) {
  const sql = userId === null
    ? `SELECT data FROM ${tableName} ORDER BY id ASC`
    : `SELECT data FROM ${tableName} WHERE userId = ? ORDER BY id ASC`;

  const params = userId === null ? [] : [userId];
  return db.prepare(sql).all(...params).map((row) => JSON.parse(row.data));
}

function writeCollection(tableName, items) {
  const deleteStmt = db.prepare(`DELETE FROM ${tableName}`);
  const insertStmt = db.prepare(`INSERT INTO ${tableName} (id, userId, data) VALUES (?, ?, ?)`);

  const transaction = db.transaction((rows) => {
    deleteStmt.run();
    for (const item of rows) {
      insertStmt.run(item.id, item.userId, JSON.stringify(item));
    }
  });

  transaction(items);
}

function readEmployees() {
  return readCollection('employees');
}

function writeEmployees(items) {
  writeCollection('employees', items);
}

function readDepartments() {
  return readCollection('departments');
}

function writeDepartments(items) {
  writeCollection('departments', items);
}

function readAttendance() {
  return readCollection('attendance');
}

function writeAttendance(items) {
  writeCollection('attendance', items);
}

function readLeaveRequests() {
  return readCollection('leaveRequests');
}

function writeLeaveRequests(items) {
  writeCollection('leaveRequests', items);
}

function readPayroll() {
  return readCollection('payroll');
}

function writePayroll(items) {
  writeCollection('payroll', items);
}

function readRecruitment() {
  return readCollection('recruitment');
}

function writeRecruitment(items) {
  writeCollection('recruitment', items);
}

module.exports = {
  db,
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
};
