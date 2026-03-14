// Delivery controller for creating, tracking, and validating outbound stock documents.
const db = require("../db");
const deliveryModel = require("../models/deliveryModel");
const warehouseModel = require("../models/warehouseModel");
const inventoryService = require("../services/inventoryService");
const asyncHandler = require("../utils/asyncHandler");
const generateCode = require("../utils/generateCode");
const httpError = require("../utils/httpError");
const { ensureOperationItems, validateRequiredFields } = require("../utils/validators");

const DELIVERY_STATUSES = ["draft", "picked", "packed", "validated"];

async function ensureValidLocation(warehouseId, locationId) {
  const location = await warehouseModel.findLocationById(locationId);
  if (!location || Number(location.warehouse_id) !== Number(warehouseId)) {
    throw httpError(400, "Selected location does not belong to the selected warehouse.");
  }
}

const listDeliveries = asyncHandler(async (_req, res) => {
  const deliveries = await deliveryModel.listDeliveries();
  res.json({ deliveries });
});

const getDelivery = asyncHandler(async (req, res) => {
  const delivery = await deliveryModel.findDeliveryWithItems(Number(req.params.id));
  if (!delivery) {
    throw httpError(404, "Delivery order not found.");
  }
  res.json({ delivery });
});

const createDelivery = asyncHandler(async (req, res) => {
  const validation = validateRequiredFields(["customer_name", "warehouse_id", "location_id"], req.body);
  const itemsValidation = ensureOperationItems(req.body.items);

  if (!validation.valid) {
    throw httpError(400, `Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  if (!itemsValidation.valid) {
    throw httpError(400, "Delivery items must include at least one product with a positive quantity.");
  }

  await ensureValidLocation(req.body.warehouse_id, req.body.location_id);

  const requestedStatus = DELIVERY_STATUSES.includes(req.body.status) ? req.body.status : "draft";

  const delivery = await db.withTransaction(async (client) => {
    const createdDelivery = await deliveryModel.createDelivery(client, {
      deliveryNumber: generateCode("DLV"),
      customerName: req.body.customer_name,
      warehouseId: Number(req.body.warehouse_id),
      locationId: Number(req.body.location_id),
      status: requestedStatus === "validated" ? "draft" : requestedStatus,
      notes: req.body.notes,
      createdBy: req.user.id,
    });

    await deliveryModel.createDeliveryItems(client, createdDelivery.id, itemsValidation.items);

    if (requestedStatus === "validated") {
      for (const item of itemsValidation.items) {
        await inventoryService.changeStock(client, {
          productId: item.product_id,
          warehouseId: Number(req.body.warehouse_id),
          locationId: Number(req.body.location_id),
          quantityChange: Number(item.quantity) * -1,
          actionType: "DELIVERY",
          referenceType: "delivery",
          referenceId: createdDelivery.id,
          notes: req.body.notes || `Delivery to ${req.body.customer_name}`,
          createdBy: req.user.id,
        });
      }
    }

    if (requestedStatus === "validated") {
      return deliveryModel.updateDeliveryStatus(client, createdDelivery.id, "validated", req.user.id);
    }

    return createdDelivery;
  });

  res.status(201).json({
    message:
      requestedStatus === "validated"
        ? "Delivery order created and validated."
        : "Delivery order created successfully.",
    delivery,
  });
});

const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const deliveryId = Number(req.params.id);
  const { status } = req.body;

  if (!DELIVERY_STATUSES.includes(status)) {
    throw httpError(400, "Status must be draft, picked, packed, or validated.");
  }

  const delivery = await deliveryModel.findDeliveryWithItems(deliveryId);
  if (!delivery) {
    throw httpError(404, "Delivery order not found.");
  }

  const updatedDelivery = await db.withTransaction(async (client) => {
    if (status === "validated") {
      if (delivery.status === "validated") {
        throw httpError(400, "Delivery order has already been validated.");
      }

      for (const item of delivery.items) {
        await inventoryService.changeStock(client, {
          productId: Number(item.product_id),
          warehouseId: Number(delivery.warehouse_id),
          locationId: Number(delivery.location_id),
          quantityChange: Number(item.quantity) * -1,
          actionType: "DELIVERY",
          referenceType: "delivery",
          referenceId: delivery.id,
          notes: delivery.notes || `Delivery to ${delivery.customer_name}`,
          createdBy: req.user.id,
        });
      }
    }

    return deliveryModel.updateDeliveryStatus(
      client,
      deliveryId,
      status,
      status === "validated" ? req.user.id : null
    );
  });

  res.json({ message: "Delivery status updated successfully.", delivery: updatedDelivery });
});

module.exports = {
  listDeliveries,
  getDelivery,
  createDelivery,
  updateDeliveryStatus,
};