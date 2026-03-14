// Transfer model queries for internal warehouse transfer documents and item lines.
const db = require("../db");

async function createTransfer(client, payload) {
  const result = await client.query(
    `INSERT INTO transfers (
       transfer_number, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id,
       status, notes, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      payload.transferNumber,
      payload.fromWarehouseId,
      payload.fromLocationId,
      payload.toWarehouseId,
      payload.toLocationId,
      payload.status,
      payload.notes || null,
      payload.createdBy || null,
    ]
  );
  return result.rows[0];
}

async function createTransferItems(client, transferId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO transfer_items (transfer_id, product_id, quantity)
       VALUES ($1, $2, $3)`,
      [transferId, item.product_id, item.quantity]
    );
  }
}

async function listTransfers() {
  const result = await db.query(
    `SELECT t.id, t.transfer_number, t.status, t.notes, t.created_at, t.validated_at,
            fw.name AS from_warehouse_name, fwl.name AS from_location_name,
            tw.name AS to_warehouse_name, twl.name AS to_location_name,
            u.name AS created_by_name,
            COALESCE(SUM(ti.quantity), 0) AS total_quantity
     FROM transfers t
     INNER JOIN warehouses fw ON fw.id = t.from_warehouse_id
     INNER JOIN warehouse_locations fwl ON fwl.id = t.from_location_id
     INNER JOIN warehouses tw ON tw.id = t.to_warehouse_id
     INNER JOIN warehouse_locations twl ON twl.id = t.to_location_id
     LEFT JOIN users u ON u.id = t.created_by
     LEFT JOIN transfer_items ti ON ti.transfer_id = t.id
     GROUP BY t.id, fw.name, fwl.name, tw.name, twl.name, u.name
     ORDER BY t.created_at DESC`
  );
  return result.rows;
}

async function findTransferWithItems(id) {
  const transferResult = await db.query("SELECT * FROM transfers WHERE id = $1", [id]);
  const transfer = transferResult.rows[0];

  if (!transfer) {
    return null;
  }

  const itemsResult = await db.query(
    `SELECT ti.id, ti.product_id, p.name AS product_name, p.sku, ti.quantity
     FROM transfer_items ti
     INNER JOIN products p ON p.id = ti.product_id
     WHERE ti.transfer_id = $1`,
    [id]
  );

  return { ...transfer, items: itemsResult.rows };
}

async function markTransferValidated(client, id, validatedBy) {
  const result = await client.query(
    `UPDATE transfers
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
  createTransfer,
  createTransferItems,
  listTransfers,
  findTransferWithItems,
  markTransferValidated,
};
