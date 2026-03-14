// API routes for delivery order workflows and status transitions.
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  listDeliveries,
  getDelivery,
  createDelivery,
  updateDeliveryStatus,
} = require("../controllers/deliveryController");

const router = express.Router();

router.use(authMiddleware);
router.get("/", listDeliveries);
router.get("/:id", getDelivery);
router.post("/", roleMiddleware("admin", "inventory_manager"), createDelivery);
router.patch("/:id/status", roleMiddleware("admin", "inventory_manager", "warehouse_staff"), updateDeliveryStatus);

module.exports = router;
