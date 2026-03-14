// Adjustment controller for stock count corrections and inventory reconciliations.
const db = require("../db");
const adjustmentModel = require("../models/adjustmentModel");
const stockModel = require("../models/stockModel");
const warehouseModel = require("../models/warehouseModel");
const inventoryService = require("../services/inventoryService");
const asyncHandler = require("../utils/asyncHandler");
const generateCode = require("../utils/generateCode");
const httpError = require("../utils/httpError");
const { isNonNegativeNumber, validateRequiredFields } = require("../utils/validators");

const listAdjustments = asyncHandler(async (_req, res) => {
  const adjustments = await adjustmentModel.listAdjustments();
  res.json({ adjustments });
});

const createAdjustment = asyncHandler(async (req, res) => {
  const validation = validateRequiredFields(["warehouse_id", "location_id", "product_id", "counted_quantity"], req.body);

  if (!validation.valid) {
    throw httpError(400, `Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  if (!isNonNegativeNumber(req.body.counted_quantity)) {
    throw httpError(400, "Counted quantity must be zero or greater.");
  }

  const location = await warehouseModel.findLocationById(Number(req.body.location_id));
  if (!location || Number(location.warehouse_id) !== Number(req.body.warehouse_id)) {
    throw httpError(400, "Selected location does not belong to the selected warehouse.");
  }

  const adjustment = await db.withTransaction(async (client) => {
    await stockModel.ensureStockRow(client, {
      productId: Number(req.body.product_id),
      warehouseId: Number(req.body.warehouse_id),
      locationId: Number(req.body.location_id),
    });

    const stock = await stockModel.getStockBalance(client, {
      productId: Number(req.body.product_id),
      warehouseId: Number(req.body.warehouse_id),
      locationId: Number(req.body.location_id),
    });

    const systemQuantity = Number(stock ? stock.quantity : 0);
    const countedQuantity = Number(req.body.counted_quantity);
    const adjustmentQuantity = countedQuantity - systemQuantity;

    const createdAdjustment = await adjustmentModel.createAdjustment(client, {
      adjustmentNumber: generateCode("ADJ"),
      warehouseId: Number(req.body.warehouse_id),
      locationId: Number(req.body.location_id),
      productId: Number(req.body.product_id),
      systemQuantity,
      countedQuantity,
      adjustmentQuantity,
      reason: req.body.reason,
      createdBy: req.user.id,
    });

    if (adjustmentQuantity !== 0) {
      await inventoryService.changeStock(client, {
        productId: Number(req.body.product_id),
        warehouseId: Number(req.body.warehouse_id),
        locationId: Number(req.body.location_id),
        quantityChange: adjustmentQuantity,
        actionType: "ADJUSTMENT",
        referenceType: "adjustment",
        referenceId: createdAdjustment.id,
        notes: req.body.reason || "Stock count adjustment",
        createdBy: req.user.id,
      });
    }

    return createdAdjustment;
  });

  res.status(201).json({ message: "Stock adjustment recorded successfully.", adjustment });
});

module.exports = {
  listAdjustments,
  createAdjustment,
};
