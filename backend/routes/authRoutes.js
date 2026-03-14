// API routes placeholder for authentication-related endpoints.
const express = require("express");
const { getAuthStatus } = require("../controllers/authController");

const router = express.Router();

router.get("/", getAuthStatus);

module.exports = router;
