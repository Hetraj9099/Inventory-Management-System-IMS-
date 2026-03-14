// Receipt model queries for incoming goods documents and item lines.
const db = require("../db");

async function createReceipt(client, payload) {
  const result = await client.query(
    `INSERT INTO receipts (
       receipt_number, supplier_name, warehouse_id, location_id, status, notes, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      payload.receiptNumber,
      payload.supplierName,
      payload.warehouseId,
      payload.locationId,
      payload.status,
      payload.notes || null,
      payload.createdBy || null,
    ]
  );
  return result.rows[0];
}

async function createReceiptItems(client, receiptId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO receipt_items (receipt_id, product_id, quantity)
       VALUES ($1, $2, $3)`,
      [receiptId, item.product_id, item.quantity]
    );
  }
}

async function listReceipts() {
  const result = await db.query(
    `SELECT r.id, r.receipt_number, r.supplier_name, r.status, r.notes, r.created_at, r.validated_at,
            w.name AS warehouse_name, wl.name AS location_name, u.name AS created_by_name,
            COALESCE(SUM(ri.quantity), 0) AS total_quantity
     FROM receipts r
     INNER JOIN warehouses w ON w.id = r.warehouse_id
     INNER JOIN warehouse_locations wl ON wl.id = r.location_id
     LEFT JOIN users u ON u.id = r.created_by
     LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
     GROUP BY r.id, w.name, wl.name, u.name
     ORDER BY r.created_at DESC`
  );
  return result.rows;
}

async function findReceiptWithItems(id) {
  const receiptResult = await db.query("SELECT * FROM receipts WHERE id = $1", [id]);
  const receipt = receiptResult.rows[0];

  if (!receipt) {
    return null;
  }

  const itemsResult = await db.query(
    `SELECT ri.id, ri.product_id, p.name AS product_name, p.sku, ri.quantity
     FROM receipt_items ri
     INNER JOIN products p ON p.id = ri.product_id
     WHERE ri.receipt_id = $1`,
    [id]
  );

  return { ...receipt, items: itemsResult.rows };
}

async function markReceiptValidated(client, id, validatedBy) {
  const result = await client.query(
    `UPDATE receipts
     SET status = 'validated',
         validated_by = $2,
         validated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status <> 'validated'
     RETURNING *`,
    [id, validatedBy]
  );
  return result.rows[0] || null;
}

module.exports = {
  createReceipt,
  createReceiptItems,
  listReceipts,
  findReceiptWithItems,
  markReceiptValidated,
};