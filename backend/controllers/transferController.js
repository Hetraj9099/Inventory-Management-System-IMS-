// Transfer controller for warehouse-to-warehouse and location-to-location stock movements.
const db = require("../db");
const transferModel = require("../models/transferModel");
const warehouseModel = require("../models/warehouseModel");
const inventoryService = require("../services/inventoryService");
const asyncHandler = require("../utils/asyncHandler");
const generateCode = require("../utils/generateCode");
const httpError = require("../utils/httpError");
const { ensureOperationItems, validateRequiredFields } = require("../utils/validators");

async function ensureTransferLocations(fromWarehouseId, fromLocationId, toWarehouseId, toLocationId) {
  const fromLocation = await warehouseModel.findLocationById(fromLocationId);
  const toLocation = await warehouseModel.findLocationById(toLocationId);

  if (!fromLocation || Number(fromLocation.warehouse_id) !== Number(fromWarehouseId)) {
    throw httpError(400, "Source location does not belong to the source warehouse.");
  }

  if (!toLocation || Number(toLocation.warehouse_id) !== Number(toWarehouseId)) {
    throw httpError(400, "Destination location does not belong to the destination warehouse.");
  }
}

const listTransfers = asyncHandler(async (_req, res) => {
  const transfers = await transferModel.listTransfers();
  res.json({ transfers });
});

const getTransfer = asyncHandler(async (req, res) => {
  const transfer = await transferModel.findTransferWithItems(Number(req.params.id));
  if (!transfer) {
    throw httpError(404, "Transfer not found.");
  }
  res.json({ transfer });
});

const createTransfer = asyncHandler(async (req, res) => {
  const validation = validateRequiredFields(
    ["from_warehouse_id", "from_location_id", "to_warehouse_id", "to_location_id"],
    req.body
  );
  const itemsValidation = ensureOperationItems(req.body.items);

  if (!validation.valid) {
    throw httpError(400, `Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  if (!itemsValidation.valid) {
    throw httpError(400, "Transfer items must include at least one product with a positive quantity.");
  }

  if (Number(req.body.from_location_id) === Number(req.body.to_location_id)) {
    throw httpError(400, "Source and destination locations must be different.");
  }

  await ensureTransferLocations(
    req.body.from_warehouse_id,
    req.body.from_location_id,
    req.body.to_warehouse_id,
    req.body.to_location_id
  );

  const shouldValidate = req.body.status === "validated";

  const transfer = await db.withTransaction(async (client) => {
    const createdTransfer = await transferModel.createTransfer(client, {
      transferNumber: generateCode("TRF"),
      fromWarehouseId: Number(req.body.from_warehouse_id),
      fromLocationId: Number(req.body.from_location_id),
      toWarehouseId: Number(req.body.to_warehouse_id),
      toLocationId: Number(req.body.to_location_id),
      status: "draft",
      notes: req.body.notes,
      createdBy: req.user.id,
    });

    await transferModel.createTransferItems(client, createdTransfer.id, itemsValidation.items);

    if (shouldValidate) {
      for (const item of itemsValidation.items) {
        await inventoryService.changeStock(client, {
          productId: item.product_id,
          warehouseId: Number(req.body.from_warehouse_id),
          locationId: Number(req.body.from_location_id),
          quantityChange: Number(item.quantity) * -1,
          actionType: "TRANSFER",
          referenceType: "transfer",
          referenceId: createdTransfer.id,
          notes: req.body.notes || "Transfer out",
          createdBy: req.user.id,
        });

        await inventoryService.changeStock(client, {
          productId: item.product_id,
          warehouseId: Number(req.body.to_warehouse_id),
          locationId: Number(req.body.to_location_id),
          quantityChange: Number(item.quantity),
          actionType: "TRANSFER",
          referenceType: "transfer",
          referenceId: createdTransfer.id,
          notes: req.body.notes || "Transfer in",
          createdBy: req.user.id,
        });
      }

      return transferModel.markTransferValidated(client, createdTransfer.id, req.user.id);
    }

    return createdTransfer;
  });

  res.status(201).json({
    message: shouldValidate ? "Transfer created and validated." : "Transfer created successfully.",
    transfer,
  });
});

const validateTransfer = asyncHandler(async (req, res) => {
  const transfer = await transferModel.findTransferWithItems(Number(req.params.id));

  if (!transfer) {
    throw httpError(404, "Transfer not found.");
  }

  if (transfer.status === "validated") {
    throw httpError(400, "Transfer has already been validated.");
  }

  const updatedTransfer = await db.withTransaction(async (client) => {
    for (const item of transfer.items) {
      await inventoryService.changeStock(client, {
        productId: Number(item.product_id),
        warehouseId: Number(transfer.from_warehouse_id),
        locationId: Number(transfer.from_location_id),
        quantityChange: Number(item.quantity) * -1,
        actionType: "TRANSFER",
        referenceType: "transfer",
        referenceId: transfer.id,
        notes: transfer.notes || "Transfer out",
        createdBy: req.user.id,
      });

      await inventoryService.changeStock(client, {
        productId: Number(item.product_id),
        warehouseId: Number(transfer.to_warehouse_id),
        locationId: Number(transfer.to_location_id),
        quantityChange: Number(item.quantity),
        actionType: "TRANSFER",
        referenceType: "transfer",
        referenceId: transfer.id,
        notes: transfer.notes || "Transfer in",
        createdBy: req.user.id,
      });
    }

    return transferModel.markTransferValidated(client, transfer.id, req.user.id);
  });

  res.json({ message: "Transfer validated successfully.", transfer: updatedTransfer });
});

module.exports = {
  listTransfers,
  getTransfer,
  createTransfer,
  validateTransfer,
};
