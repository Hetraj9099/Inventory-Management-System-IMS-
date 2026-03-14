// API routes placeholder for product management endpoints.
const express = require("express");
const { getProductsPlaceholder } = require("../controllers/productController");

const router = express.Router();

router.get("/", getProductsPlaceholder);

module.exports = router;
