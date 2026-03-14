// API routes placeholder for stock adjustment endpoints.
const express = require("express");
const { getAdjustmentsPlaceholder } = require("../controllers/adjustmentController");

const router = express.Router();

router.get("/", getAdjustmentsPlaceholder);

module.exports = router;
