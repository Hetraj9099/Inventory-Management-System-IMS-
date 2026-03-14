// API routes for authentication, profile access, and admin user management.
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
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
} = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password/request-otp", requestPasswordResetOtp);
router.post("/forgot-password/reset", resetPasswordWithOtp);
router.get("/profile", authMiddleware, getProfile);
router.post("/reset-password", authMiddleware, resetPassword);
router.get("/users", authMiddleware, roleMiddleware("admin"), listUsers);
router.post("/users", authMiddleware, roleMiddleware("admin"), createUser);
router.patch("/users/:id", authMiddleware, roleMiddleware("admin"), updateUser);
router.delete("/users/:id", authMiddleware, roleMiddleware("admin"), deleteUser);
router.post("/users/:id/reset-password", authMiddleware, roleMiddleware("admin"), adminResetPassword);

module.exports = router;
