// Stock ledger model queries for movement history and traceability reporting.
const db = require("../db");

async function createLedgerEntry(clientOrDb, entry) {
  const executor = clientOrDb.query ? clientOrDb : db;
  const result = await executor.query(
    `INSERT INTO stock_ledger (
       action_type,
       product_id,
       warehouse_id,
       location_id,
       quantity_change,
       quantity_after,
       reference_type,
       reference_id,
       notes,
       created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, action_type, product_id, warehouse_id, location_id, quantity_change,
               quantity_after, reference_type, reference_id, notes, created_at`,
    [
      entry.actionType,
      entry.productId,
      entry.warehouseId,
      entry.locationId,
      entry.quantityChange,
      entry.quantityAfter,
      entry.referenceType,
      entry.referenceId,
      entry.notes || null,
      entry.createdBy || null,
    ]
  );
  return result.rows[0];
}

async function listLedger(filters) {
  const conditions = [];
  const values = [];

  if (filters.warehouseId) {
    values.push(Number(filters.warehouseId));
    conditions.push(`sl.warehouse_id = $${values.length}`);
  }

  if (filters.actionType) {
    values.push(filters.actionType.toUpperCase());
    conditions.push(`sl.action_type = $${values.length}`);
  }

  if (filters.categoryId) {
    values.push(Number(filters.categoryId));
    conditions.push(`p.category_id = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(p.name ILIKE $${values.length} OR p.sku ILIKE $${values.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.query(
    `SELECT sl.id, sl.action_type, sl.quantity_change, sl.quantity_after, sl.reference_type,
            sl.reference_id, sl.notes, sl.created_at,
            p.name AS product_name, p.sku,
            w.name AS warehouse_name,
            wl.name AS location_name,
            u.name AS created_by_name
     FROM stock_ledger sl
     INNER JOIN products p ON p.id = sl.product_id
     INNER JOIN warehouses w ON w.id = sl.warehouse_id
     INNER JOIN warehouse_locations wl ON wl.id = sl.location_id
     LEFT JOIN users u ON u.id = sl.created_by
     ${whereClause}
     ORDER BY sl.created_at DESC
     LIMIT 200`,
    values
  );

  return result.rows;
}

module.exports = {
  createLedgerEntry,
  listLedger,
};