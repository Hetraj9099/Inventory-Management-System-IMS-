// API routes for incoming goods receipt workflows.
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  listReceipts,
  getReceipt,
  createReceipt,
  validateReceipt,
} = require("../controllers/receiptController");

const router = express.Router();

router.use(authMiddleware);
router.get("/", listReceipts);
router.get("/:id", getReceipt);
router.post("/", roleMiddleware("admin", "inventory_manager", "warehouse_staff"), createReceipt);
router.post("/:id/validate", roleMiddleware("admin", "inventory_manager", "warehouse_staff"), validateReceipt);

module.exports = router;