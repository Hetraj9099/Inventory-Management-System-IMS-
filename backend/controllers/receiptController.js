// Receipt controller for creating and validating incoming stock documents.
const db = require("../db");
const receiptModel = require("../models/receiptModel");
const warehouseModel = require("../models/warehouseModel");
const inventoryService = require("../services/inventoryService");
const asyncHandler = require("../utils/asyncHandler");
const generateCode = require("../utils/generateCode");
const httpError = require("../utils/httpError");
const { ensureOperationItems, validateRequiredFields } = require("../utils/validators");

async function ensureValidLocation(warehouseId, locationId) {
  const location = await warehouseModel.findLocationById(locationId);
  if (!location || Number(location.warehouse_id) !== Number(warehouseId)) {
    throw httpError(400, "Selected location does not belong to the selected warehouse.");
  }
}

const listReceipts = asyncHandler(async (_req, res) => {
  const receipts = await receiptModel.listReceipts();
  res.json({ receipts });
});

const getReceipt = asyncHandler(async (req, res) => {
  const receipt = await receiptModel.findReceiptWithItems(Number(req.params.id));
  if (!receipt) {
    throw httpError(404, "Receipt not found.");
  }
  res.json({ receipt });
});

const createReceipt = asyncHandler(async (req, res) => {
  const validation = validateRequiredFields(["supplier_name", "warehouse_id", "location_id"], req.body);
  const itemsValidation = ensureOperationItems(req.body.items);

  if (!validation.valid) {
    throw httpError(400, `Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  if (!itemsValidation.valid) {
    throw httpError(400, "Receipt items must include at least one product with a positive quantity.");
  }

  await ensureValidLocation(req.body.warehouse_id, req.body.location_id);

  const shouldValidate = req.body.status === "validated";

  const receipt = await db.withTransaction(async (client) => {
    const createdReceipt = await receiptModel.createReceipt(client, {
      receiptNumber: generateCode("RCPT"),
      supplierName: req.body.supplier_name,
      warehouseId: Number(req.body.warehouse_id),
      locationId: Number(req.body.location_id),
      status: "draft",
      notes: req.body.notes,
      createdBy: req.user.id,
    });

    await receiptModel.createReceiptItems(client, createdReceipt.id, itemsValidation.items);

    if (shouldValidate) {
      for (const item of itemsValidation.items) {
        await inventoryService.changeStock(client, {
          productId: item.product_id,
          warehouseId: Number(req.body.warehouse_id),
          locationId: Number(req.body.location_id),
          quantityChange: Number(item.quantity),
          actionType: "RECEIPT",
          referenceType: "receipt",
          referenceId: createdReceipt.id,
          notes: req.body.notes || `Receipt from ${req.body.supplier_name}`,
          createdBy: req.user.id,
        });
      }

      return receiptModel.markReceiptValidated(client, createdReceipt.id, req.user.id);
    }

    return createdReceipt;
  });

  res.status(201).json({
    message: shouldValidate ? "Receipt created and validated." : "Receipt created successfully.",
    receipt,
  });
});

const validateReceipt = asyncHandler(async (req, res) => {
  const receipt = await receiptModel.findReceiptWithItems(Number(req.params.id));

  if (!receipt) {
    throw httpError(404, "Receipt not found.");
  }

  if (receipt.status === "validated") {
    throw httpError(400, "Receipt has already been validated.");
  }

  await ensureValidLocation(receipt.warehouse_id, receipt.location_id);

  const updatedReceipt = await db.withTransaction(async (client) => {
    for (const item of receipt.items) {
      await inventoryService.changeStock(client, {
        productId: Number(item.product_id),
        warehouseId: Number(receipt.warehouse_id),
        locationId: Number(receipt.location_id),
        quantityChange: Number(item.quantity),
        actionType: "RECEIPT",
        referenceType: "receipt",
        referenceId: receipt.id,
        notes: receipt.notes || `Receipt from ${receipt.supplier_name}`,
        createdBy: req.user.id,
      });
    }

    return receiptModel.markReceiptValidated(client, receipt.id, req.user.id);
  });

  res.json({ message: "Receipt validated successfully.", receipt: updatedReceipt });
});

module.exports = {
  listReceipts,
  getReceipt,
  createReceipt,
  validateReceipt,
};