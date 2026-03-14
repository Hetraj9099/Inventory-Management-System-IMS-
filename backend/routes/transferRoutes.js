// API routes placeholder for internal transfer endpoints.
const express = require("express");
const { getTransfersPlaceholder } = require("../controllers/transferController");

const router = express.Router();

router.get("/", getTransfersPlaceholder);

module.exports = router;
