// API routes placeholder for incoming goods receipt endpoints.
const express = require("express");
const { getReceiptsPlaceholder } = require("../controllers/receiptController");

const router = express.Router();

router.get("/", getReceiptsPlaceholder);

module.exports = router;
