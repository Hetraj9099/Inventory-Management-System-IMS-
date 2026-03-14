// Dashboard controller for hackathon-friendly KPI summaries and recent inventory activity.
const db = require("../db");
const ledgerModel = require("../models/ledgerModel");
const asyncHandler = require("../utils/asyncHandler");

const getDashboard = asyncHandler(async (req, res) => {
  const warehouseId = req.query.warehouse ? Number(req.query.warehouse) : null;
  const categoryId = req.query.category ? Number(req.query.category) : null;
  const actionType = req.query.document_type || null;

  const filterParts = [];
  const values = [];

  if (warehouseId) {
    values.push(warehouseId);
    filterParts.push(`s.warehouse_id = $${values.length}`);
  }

  if (categoryId) {
    values.push(categoryId);
    filterParts.push(`p.category_id = $${values.length}`);
  }

  const stockWhere = filterParts.length ? `WHERE ${filterParts.join(" AND ")}` : "";

  const totalStockResult = await db.query(
    `SELECT COALESCE(SUM(s.quantity), 0) AS total_units,
            COUNT(DISTINCT CASE WHEN s.quantity > 0 THEN s.product_id END) AS total_products,
            COUNT(*) FILTER (WHERE s.quantity <= p.reorder_level) AS low_stock_items
     FROM stock s
     INNER JOIN products p ON p.id = s.product_id
     ${stockWhere}`,
    values
  );

  const pendingReceiptsResult = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM receipts
     WHERE status = 'draft'
       ${warehouseId ? "AND warehouse_id = $1" : ""}`,
    warehouseId ? [warehouseId] : []
  );

  const pendingDeliveriesResult = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM deliveries
     WHERE status IN ('draft', 'picked', 'packed')
       ${warehouseId ? "AND warehouse_id = $1" : ""}`,
    warehouseId ? [warehouseId] : []
  );

  const scheduledTransfersResult = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM transfers
     WHERE status = 'draft'
       ${warehouseId ? "AND (from_warehouse_id = $1 OR to_warehouse_id = $1)" : ""}`,
    warehouseId ? [warehouseId] : []
  );

  const lowStockResult = await db.query(
    `SELECT p.name, p.sku, p.reorder_level, s.quantity, w.name AS warehouse_name, wl.name AS location_name
     FROM stock s
     INNER JOIN products p ON p.id = s.product_id
     INNER JOIN warehouses w ON w.id = s.warehouse_id
     INNER JOIN warehouse_locations wl ON wl.id = s.location_id
     WHERE s.quantity <= p.reorder_level
       ${warehouseId ? "AND s.warehouse_id = $1" : ""}
       ${categoryId ? `AND p.category_id = $${warehouseId ? 2 : 1}` : ""}
     ORDER BY s.quantity ASC, p.name ASC
     LIMIT 10`,
    [warehouseId, categoryId].filter(Boolean)
  );

  const recentActivity = await ledgerModel.listLedger({
    warehouseId,
    categoryId,
    actionType,
  });

  res.json({
    kpis: {
      total_units_in_stock: Number(totalStockResult.rows[0].total_units || 0),
      total_products_in_stock: Number(totalStockResult.rows[0].total_products || 0),
      low_stock_items: Number(totalStockResult.rows[0].low_stock_items || 0),
      pending_receipts: pendingReceiptsResult.rows[0].count,
      pending_deliveries: pendingDeliveriesResult.rows[0].count,
      scheduled_transfers: scheduledTransfersResult.rows[0].count,
    },
    low_stock_alerts: lowStockResult.rows,
    recent_activity: recentActivity.slice(0, 10),
    filters_applied: {
      warehouse: warehouseId,
      category: categoryId,
      document_type: actionType,
      status: req.query.status || null,
    },
  });
});

module.exports = {
  getDashboard,
};