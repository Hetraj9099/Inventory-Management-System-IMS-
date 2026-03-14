// User model queries for authentication, signup, and admin user management.
const db = require("../db");

async function countUsers() {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM users");
  return result.rows[0].count;
}

async function findByEmail(email) {
  const result = await db.query(
    "SELECT id, name, email, password_hash, role, is_active, created_at FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await db.query(
    "SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

async function listUsers() {
  const result = await db.query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users
     ORDER BY created_at DESC`
  );
  return result.rows;
}

async function countAdmins() {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM users
     WHERE role = 'admin'`
  );
  return result.rows[0].count;
}

async function createUser({ name, email, passwordHash, role }) {
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, is_active, created_at`,
    [name, email, passwordHash, role]
  );
  return result.rows[0];
}

async function updateUserRole(id, role) {
  const result = await db.query(
    `UPDATE users
     SET role = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, email, role, is_active, created_at`,
    [id, role]
  );
  return result.rows[0] || null;
}

async function updateUserStatus(id, isActive) {
  const result = await db.query(
    `UPDATE users
     SET is_active = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, email, role, is_active, created_at`,
    [id, isActive]
  );
  return result.rows[0] || null;
}

async function updatePassword(id, passwordHash) {
  const result = await db.query(
    `UPDATE users
     SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, email, role, is_active, created_at`,
    [id, passwordHash]
  );
  return result.rows[0] || null;
}

async function deleteUser(id) {
  const result = await db.query(
    `DELETE FROM users
     WHERE id = $1
     RETURNING id, name, email, role, is_active, created_at`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  countUsers,
  countAdmins,
  findByEmail,
  findById,
  listUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  updatePassword,
  deleteUser,
};