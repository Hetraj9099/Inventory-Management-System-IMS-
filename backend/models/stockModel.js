// Stock model queries for checking and adjusting warehouse inventory balances.
const db = require("../db");

async function getStockBalance(clientOrDb, { productId, warehouseId, locationId }) {
  const executor = clientOrDb.query ? clientOrDb : db;
  const result = await executor.query(
    `SELECT id, product_id, warehouse_id, location_id, quantity
     FROM stock
     WHERE product_id = $1 AND warehouse_id = $2 AND location_id = $3`,
    [productId, warehouseId, locationId]
  );
  return result.rows[0] || null;
}

async function ensureStockRow(clientOrDb, { productId, warehouseId, locationId }) {
  const executor = clientOrDb.query ? clientOrDb : db;
  await executor.query(
    `INSERT INTO stock (product_id, warehouse_id, location_id, quantity)
     VALUES ($1, $2, $3, 0)
     ON CONFLICT (product_id, warehouse_id, location_id) DO NOTHING`,
    [productId, warehouseId, locationId]
  );
}

async function updateStockQuantity(clientOrDb, { productId, warehouseId, locationId, quantity }) {
  const executor = clientOrDb.query ? clientOrDb : db;
  const result = await executor.query(
    `UPDATE stock
     SET quantity = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE product_id = $1 AND warehouse_id = $2 AND location_id = $3
     RETURNING id, product_id, warehouse_id, location_id, quantity`,
    [productId, warehouseId, locationId, quantity]
  );
  return result.rows[0] || null;
}

module.exports = {
  getStockBalance,
  ensureStockRow,
  updateStockQuantity,
};