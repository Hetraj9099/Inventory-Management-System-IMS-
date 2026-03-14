// Delivery model queries for outbound delivery documents and item lines.
const db = require("../db");

async function createDelivery(client, payload) {
  const result = await client.query(
    `INSERT INTO deliveries (
       delivery_number, customer_name, warehouse_id, location_id, status, notes, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      payload.deliveryNumber,
      payload.customerName,
      payload.warehouseId,
      payload.locationId,
      payload.status,
      payload.notes || null,
      payload.createdBy || null,
    ]
  );
  return result.rows[0];
}

async function createDeliveryItems(client, deliveryId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO delivery_items (delivery_id, product_id, quantity)
       VALUES ($1, $2, $3)`,
      [deliveryId, item.product_id, item.quantity]
    );
  }
}

async function listDeliveries() {
  const result = await db.query(
    `SELECT d.id, d.delivery_number, d.customer_name, d.status, d.notes, d.created_at, d.validated_at,
            w.name AS warehouse_name, wl.name AS location_name, u.name AS created_by_name,
            COALESCE(SUM(di.quantity), 0) AS total_quantity
     FROM deliveries d
     INNER JOIN warehouses w ON w.id = d.warehouse_id
     INNER JOIN warehouse_locations wl ON wl.id = d.location_id
     LEFT JOIN users u ON u.id = d.created_by
     LEFT JOIN delivery_items di ON di.delivery_id = d.id
     GROUP BY d.id, w.name, wl.name, u.name
     ORDER BY d.created_at DESC`
  );
  return result.rows;
}

async function findDeliveryWithItems(id) {
  const deliveryResult = await db.query("SELECT * FROM deliveries WHERE id = $1", [id]);
  const delivery = deliveryResult.rows[0];

  if (!delivery) {
    return null;
  }

  const itemsResult = await db.query(
    `SELECT di.id, di.product_id, p.name AS product_name, p.sku, di.quantity
     FROM delivery_items di
     INNER JOIN products p ON p.id = di.product_id
     WHERE di.delivery_id = $1`,
    [id]
  );

  return { ...delivery, items: itemsResult.rows };
}

async function updateDeliveryStatus(client, id, status, validatedBy) {
  const allowedStatuses = ["draft", "picked", "packed", "validated"];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid delivery status supplied.");
  }

  const result =
    status === "validated"
      ? await client.query(
          `UPDATE deliveries
           SET status = 'validated',
               validated_by = $2,
               validated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [id, validatedBy || null]
        )
      : await client.query(
          `UPDATE deliveries
           SET status = '${status}'
           WHERE id = $1
           RETURNING *`,
          [id]
        );

  return result.rows[0] || null;
}

module.exports = {
  createDelivery,
  createDeliveryItems,
  listDeliveries,
  findDeliveryWithItems,
  updateDeliveryStatus,
};
