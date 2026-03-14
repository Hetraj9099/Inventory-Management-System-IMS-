// Product model queries for category management, catalog CRUD, and stock views.
const db = require("../db");

async function listCategories() {
  const result = await db.query(
    `SELECT id, name, description, created_at
     FROM product_categories
     ORDER BY name ASC`
  );
  return result.rows;
}

async function createCategory({ name, description }) {
  const result = await db.query(
    `INSERT INTO product_categories (name, description)
     VALUES ($1, $2)
     RETURNING id, name, description, created_at`,
    [name, description || null]
  );
  return result.rows[0];
}

async function deleteCategory(id) {
  const result = await db.query("DELETE FROM product_categories WHERE id = $1 RETURNING id", [id]);
  return result.rows[0] || null;
}

async function createProduct({ name, sku, categoryId, unitOfMeasure, reorderLevel }) {
  const result = await db.query(
    `INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, sku, category_id, unit_of_measure, reorder_level, is_active, created_at`,
    [name, sku, categoryId || null, unitOfMeasure, reorderLevel]
  );
  return result.rows[0];
}

async function updateProduct(id, { name, sku, categoryId, unitOfMeasure, reorderLevel, isActive }) {
  const result = await db.query(
    `UPDATE products
     SET name = $2,
         sku = $3,
         category_id = $4,
         unit_of_measure = $5,
         reorder_level = $6,
         is_active = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, sku, category_id, unit_of_measure, reorder_level, is_active, created_at`,
    [id, name, sku, categoryId || null, unitOfMeasure, reorderLevel, isActive]
  );
  return result.rows[0] || null;
}

async function deleteProduct(id) {
  const result = await db.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
  return result.rows[0] || null;
}

async function findProductById(id) {
  const result = await db.query(
    `SELECT p.id, p.name, p.sku, p.category_id, p.unit_of_measure, p.reorder_level, p.is_active,
            pc.name AS category_name
     FROM products p
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function listProducts(filters) {
  const conditions = [];
  const values = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(p.name ILIKE $${values.length} OR p.sku ILIKE $${values.length})`);
  }

  if (filters.categoryId) {
    values.push(Number(filters.categoryId));
    conditions.push(`p.category_id = $${values.length}`);
  }

  if (filters.isActive !== undefined) {
    values.push(filters.isActive === "true");
    conditions.push(`p.is_active = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.query(
    `SELECT p.id, p.name, p.sku, p.category_id, p.unit_of_measure, p.reorder_level, p.is_active,
            p.created_at, pc.name AS category_name,
            COALESCE(SUM(s.quantity), 0) AS total_stock
     FROM products p
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     LEFT JOIN stock s ON s.product_id = p.id
     ${whereClause}
     GROUP BY p.id, pc.name
     ORDER BY p.created_at DESC`,
    values
  );

  return result.rows;
}

async function listStock(filters) {
  const conditions = [];
  const values = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(p.name ILIKE $${values.length} OR p.sku ILIKE $${values.length})`);
  }

  if (filters.warehouseId) {
    values.push(Number(filters.warehouseId));
    conditions.push(`s.warehouse_id = $${values.length}`);
  }

  if (filters.categoryId) {
    values.push(Number(filters.categoryId));
    conditions.push(`p.category_id = $${values.length}`);
  }

  if (filters.lowStockOnly === "true") {
    conditions.push("s.quantity <= p.reorder_level");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.query(
    `SELECT s.id, s.quantity, s.updated_at,
            p.id AS product_id, p.name AS product_name, p.sku, p.unit_of_measure, p.reorder_level,
            pc.name AS category_name,
            w.id AS warehouse_id, w.name AS warehouse_name,
            wl.id AS location_id, wl.name AS location_name
     FROM stock s
     INNER JOIN products p ON p.id = s.product_id
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     INNER JOIN warehouses w ON w.id = s.warehouse_id
     INNER JOIN warehouse_locations wl ON wl.id = s.location_id
     ${whereClause}
     ORDER BY p.name ASC, w.name ASC, wl.name ASC`,
    values
  );

  return result.rows;
}

module.exports = {
  listCategories,
  createCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  findProductById,
  listProducts,
  listStock,
};
