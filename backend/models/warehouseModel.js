// Warehouse model queries for warehouse and location administration.
const db = require("../db");

async function listWarehouses() {
  const result = await db.query(
    `SELECT w.id, w.name, w.code, w.address, w.is_active, w.created_at,
            COALESCE(
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'id', wl.id,
                  'name', wl.name,
                  'code', wl.code,
                  'is_active', wl.is_active
                )
              ) FILTER (WHERE wl.id IS NOT NULL),
              '[]'
            ) AS locations
     FROM warehouses w
     LEFT JOIN warehouse_locations wl ON wl.warehouse_id = w.id
     GROUP BY w.id
     ORDER BY w.created_at DESC`
  );
  return result.rows;
}

async function createWarehouse({ name, code, address }) {
  const result = await db.query(
    `INSERT INTO warehouses (name, code, address)
     VALUES ($1, $2, $3)
     RETURNING id, name, code, address, is_active, created_at`,
    [name, code, address || null]
  );
  return result.rows[0];
}

async function updateWarehouse(id, { name, code, address, isActive }) {
  const result = await db.query(
    `UPDATE warehouses
     SET name = $2,
         code = $3,
         address = $4,
         is_active = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, code, address, is_active, created_at`,
    [id, name, code, address || null, isActive]
  );
  return result.rows[0] || null;
}

async function deleteWarehouse(id) {
  const result = await db.query("DELETE FROM warehouses WHERE id = $1 RETURNING id", [id]);
  return result.rows[0] || null;
}

async function createLocation({ warehouseId, name, code }) {
  const result = await db.query(
    `INSERT INTO warehouse_locations (warehouse_id, name, code)
     VALUES ($1, $2, $3)
     RETURNING id, warehouse_id, name, code, is_active, created_at`,
    [warehouseId, name, code]
  );
  return result.rows[0];
}

async function updateLocation(id, { name, code, isActive }) {
  const result = await db.query(
    `UPDATE warehouse_locations
     SET name = $2,
         code = $3,
         is_active = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, warehouse_id, name, code, is_active, created_at`,
    [id, name, code, isActive]
  );
  return result.rows[0] || null;
}

async function deleteLocation(id) {
  const result = await db.query("DELETE FROM warehouse_locations WHERE id = $1 RETURNING id", [id]);
  return result.rows[0] || null;
}

async function listLocationsByWarehouse(warehouseId) {
  const result = await db.query(
    `SELECT id, warehouse_id, name, code, is_active, created_at
     FROM warehouse_locations
     WHERE warehouse_id = $1
     ORDER BY name ASC`,
    [warehouseId]
  );
  return result.rows;
}

async function findLocationById(id) {
  const result = await db.query(
    `SELECT id, warehouse_id, name, code, is_active
     FROM warehouse_locations
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  createLocation,
  updateLocation,
  deleteLocation,
  listLocationsByWarehouse,
  findLocationById,
};
