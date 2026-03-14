// API routes for warehouse and warehouse location management.
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  createLocation,
  updateLocation,
  deleteLocation,
  listLocations,
} = require("../controllers/warehouseController");

const router = express.Router();

router.use(authMiddleware);
router.get("/", listWarehouses);
router.post("/", roleMiddleware("admin"), createWarehouse);
router.put("/:id", roleMiddleware("admin"), updateWarehouse);
router.delete("/:id", roleMiddleware("admin"), deleteWarehouse);
router.get("/:warehouseId/locations", listLocations);
router.post("/:warehouseId/locations", roleMiddleware("admin"), createLocation);
router.put("/locations/:id", roleMiddleware("admin"), updateLocation);
router.delete("/locations/:id", roleMiddleware("admin"), deleteLocation);

module.exports = router;
