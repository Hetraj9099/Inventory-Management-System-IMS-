// API routes for product catalog, categories, stock, and movement history.
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  listCategories,
  createCategory,
  deleteCategory,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getStockView,
  getHistoryView,
} = require("../controllers/productController");

const router = express.Router();

router.use(authMiddleware);
router.get("/categories", listCategories);
router.post("/categories", roleMiddleware("admin"), createCategory);
router.delete("/categories/:id", roleMiddleware("admin"), deleteCategory);
router.get("/stock", getStockView);
router.get("/history", getHistoryView);
router.get("/", listProducts);
router.post("/", roleMiddleware("admin", "inventory_manager"), createProduct);
router.put("/:id", roleMiddleware("admin", "inventory_manager"), updateProduct);
router.delete("/:id", roleMiddleware("admin", "inventory_manager"), deleteProduct);

module.exports = router;