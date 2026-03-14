// Password reset OTP model queries for local OTP-based password recovery.
const db = require("../db");

async function invalidateOtpsForUser(userId) {
  await db.query(
    `UPDATE password_reset_otps
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
}

async function createOtp({ userId, otpHash, expiresAt }) {
  const result = await db.query(
    `INSERT INTO password_reset_otps (user_id, otp_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, expires_at, created_at`,
    [userId, otpHash, expiresAt]
  );
  return result.rows[0];
}

async function findLatestActiveOtpByUserId(userId) {
  const result = await db.query(
    `SELECT id, user_id, otp_hash, expires_at, used_at, created_at
     FROM password_reset_otps
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function markOtpUsed(id) {
  await db.query(
    `UPDATE password_reset_otps
     SET used_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id]
  );
}

module.exports = {
  invalidateOtpsForUser,
  createOtp,
  findLatestActiveOtpByUserId,
  markOtpUsed,
};