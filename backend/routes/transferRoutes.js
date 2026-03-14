// API routes for internal transfer workflows.
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  listTransfers,
  getTransfer,
  createTransfer,
  validateTransfer,
} = require("../controllers/transferController");

const router = express.Router();

router.use(authMiddleware);
router.get("/", listTransfers);
router.get("/:id", getTransfer);
router.post("/", roleMiddleware("admin", "inventory_manager", "warehouse_staff"), createTransfer);
router.post("/:id/validate", roleMiddleware("admin", "inventory_manager", "warehouse_staff"), validateTransfer);

module.exports = router;
