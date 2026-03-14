// Transactional stock service for receipts, deliveries, transfers, and adjustments.
const stockModel = require("../models/stockModel");
const ledgerModel = require("../models/ledgerModel");
const httpError = require("../utils/httpError");

async function changeStock(client, movement) {
  await stockModel.ensureStockRow(client, movement);

  const existingStock = await stockModel.getStockBalance(client, movement);
  const currentQuantity = Number(existingStock ? existingStock.quantity : 0);
  const nextQuantity = currentQuantity + Number(movement.quantityChange);

  if (nextQuantity < 0) {
    throw httpError(
      400,
      `Insufficient stock for product ${movement.productId} at the selected warehouse location.`
    );
  }

  const updatedStock = await stockModel.updateStockQuantity(client, {
    productId: movement.productId,
    warehouseId: movement.warehouseId,
    locationId: movement.locationId,
    quantity: nextQuantity,
  });

  await ledgerModel.createLedgerEntry(client, {
    actionType: movement.actionType,
    productId: movement.productId,
    warehouseId: movement.warehouseId,
    locationId: movement.locationId,
    quantityChange: Number(movement.quantityChange),
    quantityAfter: Number(updatedStock.quantity),
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    notes: movement.notes,
    createdBy: movement.createdBy,
  });

  return updatedStock;
}

module.exports = {
  changeStock,
};
