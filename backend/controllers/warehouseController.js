// Warehouse controller for warehouse and location administration.
const warehouseModel = require("../models/warehouseModel");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");
const { validateRequiredFields } = require("../utils/validators");

const listWarehouses = asyncHandler(async (_req, res) => {
  const warehouses = await warehouseModel.listWarehouses();
  res.json({ warehouses });
});

const createWarehouse = asyncHandler(async (req, res) => {
  const validation = validateRequiredFields(["name", "code"], req.body);

  if (!validation.valid) {
    throw httpError(400, `Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  const warehouse = await warehouseModel.createWarehouse(req.body);
  res.status(201).json({ message: "Warehouse created successfully.", warehouse });
});

const updateWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await warehouseModel.updateWarehouse(Number(req.params.id), {
    name: req.body.name,
    code: req.body.code,
    address: req.body.address,
    isActive: req.body.is_active !== undefined ? Boolean(req.body.is_active) : true,
  });

  if (!warehouse) {
    throw httpError(404, "Warehouse not found.");
  }

  res.json({ message: "Warehouse updated successfully.", warehouse });
});

const deleteWarehouse = asyncHandler(async (req, res) => {
  const deleted = await warehouseModel.deleteWarehouse(Number(req.params.id));

  if (!deleted) {
    throw httpError(404, "Warehouse not found.");
  }

  res.json({ message: "Warehouse deleted successfully." });
});

const createLocation = asyncHandler(async (req, res) => {
  const validation = validateRequiredFields(["name", "code"], req.body);

  if (!validation.valid) {
    throw httpError(400, `Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  const location = await warehouseModel.createLocation({
    warehouseId: Number(req.params.warehouseId),
    name: req.body.name,
    code: req.body.code,
  });

  res.status(201).json({ message: "Location created successfully.", location });
});

const updateLocation = asyncHandler(async (req, res) => {
  const location = await warehouseModel.updateLocation(Number(req.params.id), {
    name: req.body.name,
    code: req.body.code,
    isActive: req.body.is_active !== undefined ? Boolean(req.body.is_active) : true,
  });

  if (!location) {
    throw httpError(404, "Location not found.");
  }

  res.json({ message: "Location updated successfully.", location });
});

const deleteLocation = asyncHandler(async (req, res) => {
  const deleted = await warehouseModel.deleteLocation(Number(req.params.id));

  if (!deleted) {
    throw httpError(404, "Location not found.");
  }

  res.json({ message: "Location deleted successfully." });
});

const listLocations = asyncHandler(async (req, res) => {
  const locations = await warehouseModel.listLocationsByWarehouse(Number(req.params.warehouseId));
  res.json({ locations });
});

module.exports = {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  createLocation,
  updateLocation,
  deleteLocation,
  listLocations,
};
