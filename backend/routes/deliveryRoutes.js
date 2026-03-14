// API routes placeholder for delivery order endpoints.
const express = require("express");
const { getDeliveriesPlaceholder } = require("../controllers/deliveryController");

const router = express.Router();

router.get("/", getDeliveriesPlaceholder);

module.exports = router;
