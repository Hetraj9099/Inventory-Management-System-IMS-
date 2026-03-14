// API routes placeholder for warehouse management endpoints.
const express = require("express");
const { getWarehousesPlaceholder } = require("../controllers/warehouseController");

const router = express.Router();

router.get("/", getWarehousesPlaceholder);

module.exports = router;
