// API routes placeholder for dashboard summary endpoints.
const express = require("express");
const { getDashboardPlaceholder } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", getDashboardPlaceholder);

module.exports = router;
