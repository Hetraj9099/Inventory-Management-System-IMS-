// Product controller for categories, catalog CRUD, stock visibility, and movement history.
const productModel = require("../models/productModel");
const ledgerModel = require("../models/ledgerModel");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");
const { isNonNegativeNumber, validateRequiredFields } = require("../utils/validators");

const listCategories = asyncHandler(async (_req, res) => {
  const categories = await productModel.listCategories();
  res.json({ categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const validation = validateRequiredFields(["name"], req.body);

  if (!validation.valid) {
    throw httpError(400, `Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  const category = await productModel.createCategory(req.body);
  res.status(201).json({ message: "Category created successfully.", category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const deleted = await productModel.deleteCategory(Number(req.params.id));

  if (!deleted) {
    throw httpError(404, "Category not found.");
  }

  res.json({ message: "Category deleted successfully." });
});

const listProducts = asyncHandler(async (req, res) => {
  const products = await productModel.listProducts(req.query);
  res.json({ products });
});

const createProduct = asyncHandler(async (req, res) => {
  const validation = validateRequiredFields(["name", "sku", "unit_of_measure"], req.body);

  if (!validation.valid) {
    throw httpError(400, `Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  const reorderLevel = Number(req.body.reorder_level || 0);
  if (!isNonNegativeNumber(reorderLevel)) {
    throw httpError(400, "Reorder level must be zero or greater.");
  }

  const product = await productModel.createProduct({
    name: req.body.name,
    sku: req.body.sku,
    categoryId: req.body.category_id ? Number(req.body.category_id) : null,
    unitOfMeasure: req.body.unit_of_measure,
    reorderLevel,
  });

  res.status(201).json({ message: "Product created successfully.", product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const existing = await productModel.findProductById(productId);

  if (!existing) {
    throw httpError(404, "Product not found.");
  }

  const product = await productModel.updateProduct(productId, {
    name: req.body.name || existing.name,
    sku: req.body.sku || existing.sku,
    categoryId:
      req.body.category_id !== undefined ? Number(req.body.category_id) || null : existing.category_id,
    unitOfMeasure: req.body.unit_of_measure || existing.unit_of_measure,
    reorderLevel:
      req.body.reorder_level !== undefined ? Number(req.body.reorder_level) : Number(existing.reorder_level),
    isActive: req.body.is_active !== undefined ? Boolean(req.body.is_active) : existing.is_active,
  });

  res.json({ message: "Product updated successfully.", product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const deleted = await productModel.deleteProduct(Number(req.params.id));

  if (!deleted) {
    throw httpError(404, "Product not found.");
  }

  res.json({ message: "Product deleted successfully." });
});

const getStockView = asyncHandler(async (req, res) => {
  const stock = await productModel.listStock(req.query);
  res.json({ stock });
});

const getHistoryView = asyncHandler(async (req, res) => {
  const history = await ledgerModel.listLedger(req.query);
  res.json({ history });
});

module.exports = {
  listCategories,
  createCategory,
  deleteCategory,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getStockView,
  getHistoryView,
};