// API routes for stock adjustment workflows.
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { listAdjustments, createAdjustment } = require("../controllers/adjustmentController");

const router = express.Router();

router.use(authMiddleware);
router.get("/", listAdjustments);
router.post("/", roleMiddleware("admin", "inventory_manager", "warehouse_staff"), createAdjustment);

module.exports = router;
