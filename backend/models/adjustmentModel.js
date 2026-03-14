// Adjustment model queries for stock count corrections and reconciliations.
const db = require("../db");

async function createAdjustment(client, payload) {
  const result = await client.query(
    `INSERT INTO adjustments (
       adjustment_number, warehouse_id, location_id, product_id, system_quantity,
       counted_quantity, adjustment_quantity, reason, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      payload.adjustmentNumber,
      payload.warehouseId,
      payload.locationId,
      payload.productId,
      payload.systemQuantity,
      payload.countedQuantity,
      payload.adjustmentQuantity,
      payload.reason || null,
      payload.createdBy || null,
    ]
  );
  return result.rows[0];
}

async function listAdjustments() {
  const result = await db.query(
    `SELECT a.id, a.adjustment_number, a.system_quantity, a.counted_quantity, a.adjustment_quantity,
            a.reason, a.created_at,
            p.name AS product_name, p.sku,
            w.name AS warehouse_name, wl.name AS location_name,
            u.name AS created_by_name
     FROM adjustments a
     INNER JOIN products p ON p.id = a.product_id
     INNER JOIN warehouses w ON w.id = a.warehouse_id
     INNER JOIN warehouse_locations wl ON wl.id = a.location_id
     LEFT JOIN users u ON u.id = a.created_by
     ORDER BY a.created_at DESC`
  );
  return result.rows;
}

module.exports = {
  createAdjustment,
  listAdjustments,
};
