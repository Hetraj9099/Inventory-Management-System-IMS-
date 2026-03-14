// Authentication controller for login, signup, profile access, and admin user management.
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const passwordResetModel = require("../models/passwordResetModel");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");
const { isEmail, validateRequiredFields } = require("../utils/validators");

const ROLES = ["admin", "inventory_manager", "warehouse_staff"];

function createToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET || "coreinventory-secret",
    { expiresIn: "12h" }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const validation = validateRequiredFields(["name", "email", "password"], req.body);

  if (!validation.valid) {
    throw httpError(400, `Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  if (!isEmail(email)) {
    throw httpError(400, "A valid email address is required.");
  }

  if (String(password).length < 6) {
    throw httpError(400, "Password must be at least 6 characters long.");
  }

  const existingUser = await userModel.findByEmail(email);
  if (existingUser) {
    throw httpError(409, "An account with this email already exists.");
  }

  const totalUsers = await userModel.countUsers();
  if (totalUsers > 0 && role === "admin") {
    throw httpError(403, "Public signup cannot create additional admin accounts.");
  }

  const assignedRole =
    totalUsers === 0
      ? "admin"
      : role === "inventory_manager"
        ? "inventory_manager"
        : "warehouse_staff";
  const passwordHash = await bcrypt.hash(password, 10);
  const createdUser = await userModel.createUser({
    name,
    email: email.trim().toLowerCase(),
    passwordHash,
    role: assignedRole,
  });

  res.status(201).json({
    message:
      totalUsers === 0
        ? "First account created as admin."
        : `Account created successfully as ${assignedRole.replace("_", " ")}.`,
    token: createToken(createdUser),
    user: sanitizeUser(createdUser),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const validation = validateRequiredFields(["email", "password"], req.body);

  if (!validation.valid) {
    throw httpError(400, `Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  const user = await userModel.findByEmail(String(email).trim().toLowerCase());

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw httpError(401, "Invalid email or password.");
  }

  if (!user.is_active) {
    throw httpError(403, "This account is currently inactive.");
  }

  res.json({
    message: "Login successful.",
    token: createToken(user),
    user: sanitizeUser(user),
  });
});

const getProfile = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);

  if (!user) {
    throw httpError(404, "User profile not found.");
  }

  res.json({ user });
});

const listUsers = asyncHandler(async (_req, res) => {
  const users = await userModel.listUsers();
  res.json({ users });
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const validation = validateRequiredFields(["name", "email", "password", "role"], req.body);

  if (!validation.valid) {
    throw httpError(400, `Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  if (!ROLES.includes(role)) {
    throw httpError(400, "Role must be admin, inventory_manager, or warehouse_staff.");
  }

  const existingUser = await userModel.findByEmail(String(email).trim().toLowerCase());
  if (existingUser) {
    throw httpError(409, "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const createdUser = await userModel.createUser({
    name,
    email: String(email).trim().toLowerCase(),
    passwordHash,
    role,
  });

  res.status(201).json({ message: "User created successfully.", user: createdUser });
});

const updateUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const { role, is_active: isActive } = req.body;

  let updatedUser = await userModel.findById(userId);
  if (!updatedUser) {
    throw httpError(404, "User not found.");
  }

  if (role !== undefined) {
    if (!ROLES.includes(role)) {
      throw httpError(400, "Invalid role supplied.");
    }
    updatedUser = await userModel.updateUserRole(userId, role);
  }

  if (isActive !== undefined) {
    updatedUser = await userModel.updateUserStatus(userId, Boolean(isActive));
  }

  res.json({ message: "User updated successfully.", user: updatedUser });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { current_password: currentPassword, new_password: newPassword } = req.body;
  const user = await userModel.findByEmail(req.user.email);

  if (!user) {
    throw httpError(404, "User account not found.");
  }

  if (!currentPassword || !newPassword) {
    throw httpError(400, "Current password and new password are required.");
  }

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) {
    throw httpError(401, "Current password is incorrect.");
  }

  if (String(newPassword).length < 6) {
    throw httpError(400, "New password must be at least 6 characters long.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userModel.updatePassword(req.user.id, passwordHash);

  res.json({ message: "Password reset successful." });
});

const adminResetPassword = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const { new_password: newPassword } = req.body;

  if (!newPassword || String(newPassword).length < 6) {
    throw httpError(400, "New password must be at least 6 characters long.");
  }

  const user = await userModel.findById(userId);
  if (!user) {
    throw httpError(404, "User not found.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userModel.updatePassword(userId, passwordHash);

  res.json({ message: "User password reset successfully." });
});

const deleteUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw httpError(400, "A valid user ID is required.");
  }

  if (userId === req.user.id) {
    throw httpError(400, "You cannot delete your own account while logged in.");
  }

  const user = await userModel.findById(userId);
  if (!user) {
    throw httpError(404, "User not found.");
  }

  if (user.role === "admin") {
    const adminCount = await userModel.countAdmins();
    if (adminCount <= 1) {
      throw httpError(400, "At least one admin account must remain in the system.");
    }
  }

  await userModel.deleteUser(userId);

  res.json({ message: "User deleted successfully." });
});

const requestPasswordResetOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || !isEmail(email)) {
    throw httpError(400, "A valid email address is required.");
  }

  const user = await userModel.findByEmail(String(email).trim().toLowerCase());

  if (!user || !user.is_active) {
    return res.json({
      message: "If that account exists, an OTP has been prepared for password reset.",
    });
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await passwordResetModel.invalidateOtpsForUser(user.id);
  await passwordResetModel.createOtp({
    userId: user.id,
    otpHash,
    expiresAt,
  });

  return res.json({
    message: "OTP generated successfully for password reset.",
    otp,
    expires_in_minutes: 10,
    note: "Local demo mode: show this OTP on screen because no email service is configured.",
  });
});

const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { email, otp, new_password: newPassword } = req.body;

  if (!email || !isEmail(email)) {
    throw httpError(400, "A valid email address is required.");
  }

  if (!otp || !newPassword) {
    throw httpError(400, "OTP and new password are required.");
  }

  if (String(newPassword).length < 6) {
    throw httpError(400, "New password must be at least 6 characters long.");
  }

  const user = await userModel.findByEmail(String(email).trim().toLowerCase());

  if (!user) {
    throw httpError(404, "Account not found.");
  }

  const latestOtp = await passwordResetModel.findLatestActiveOtpByUserId(user.id);

  if (!latestOtp || latestOtp.used_at) {
    throw httpError(400, "No active OTP was found for this account. Request a new OTP.");
  }

  if (new Date(latestOtp.expires_at) < new Date()) {
    throw httpError(400, "This OTP has expired. Request a new one.");
  }

  const matches = await bcrypt.compare(String(otp).trim(), latestOtp.otp_hash);
  if (!matches) {
    throw httpError(401, "The OTP you entered is invalid.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userModel.updatePassword(user.id, passwordHash);
  await passwordResetModel.markOtpUsed(latestOtp.id);

  res.json({ message: "Password reset successfully. You can now sign in." });
});

module.exports = {
  signup,
  login,
  getProfile,
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  adminResetPassword,
  deleteUser,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
};