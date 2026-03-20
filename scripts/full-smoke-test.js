// End-to-end smoke test for CoreInventory using the live PostgreSQL database.
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const { startServer } = require("../backend/server");

const TEST_PORT = "5055";
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;
const RUN_ID = `smoke${Date.now()}`;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? true : false,
});

const created = {
  userIds: [],
  categoryIds: [],
  productIds: [],
  warehouseIds: [],
  locationIds: [],
  receiptIds: [],
  deliveryIds: [],
  transferIds: [],
  adjustmentIds: [],
};

function logStep(message) {
  console.log(`[smoke] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url, timeoutMs = 20000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (_error) {
      // Keep polling until the server is up.
    }

    await sleep(350);
  }

  throw new Error("Timed out waiting for the CoreInventory server to become healthy.");
}

async function api(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = { raw: text };
    }
  }

  if (options.expectedStatus && response.status !== options.expectedStatus) {
    throw new Error(
      `Expected ${options.expectedStatus} from ${options.method || "GET"} ${path}, got ${response.status}: ${JSON.stringify(data)}`
    );
  }

  if (!options.expectedStatus && !response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed with ${response.status}: ${JSON.stringify(data)}`);
  }

  return { status: response.status, data };
}

async function cleanup() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (created.adjustmentIds.length) {
      await client.query("DELETE FROM stock_ledger WHERE reference_type = 'adjustment' AND reference_id = ANY($1::int[])", [created.adjustmentIds]);
      await client.query("DELETE FROM adjustments WHERE id = ANY($1::int[])", [created.adjustmentIds]);
    }

    if (created.transferIds.length) {
      await client.query("DELETE FROM stock_ledger WHERE reference_type = 'transfer' AND reference_id = ANY($1::int[])", [created.transferIds]);
      await client.query("DELETE FROM transfer_items WHERE transfer_id = ANY($1::int[])", [created.transferIds]);
      await client.query("DELETE FROM transfers WHERE id = ANY($1::int[])", [created.transferIds]);
    }

    if (created.deliveryIds.length) {
      await client.query("DELETE FROM stock_ledger WHERE reference_type = 'delivery' AND reference_id = ANY($1::int[])", [created.deliveryIds]);
      await client.query("DELETE FROM delivery_items WHERE delivery_id = ANY($1::int[])", [created.deliveryIds]);
      await client.query("DELETE FROM deliveries WHERE id = ANY($1::int[])", [created.deliveryIds]);
    }

    if (created.receiptIds.length) {
      await client.query("DELETE FROM stock_ledger WHERE reference_type = 'receipt' AND reference_id = ANY($1::int[])", [created.receiptIds]);
      await client.query("DELETE FROM receipt_items WHERE receipt_id = ANY($1::int[])", [created.receiptIds]);
      await client.query("DELETE FROM receipts WHERE id = ANY($1::int[])", [created.receiptIds]);
    }

    if (created.productIds.length || created.warehouseIds.length) {
      await client.query(
        `DELETE FROM stock
         WHERE ($1::int[] <> '{}'::int[] AND product_id = ANY($1::int[]))
            OR ($2::int[] <> '{}'::int[] AND warehouse_id = ANY($2::int[]))`,
        [created.productIds, created.warehouseIds]
      );
    }

    if (created.productIds.length) {
      await client.query("DELETE FROM products WHERE id = ANY($1::int[])", [created.productIds]);
    }

    if (created.categoryIds.length) {
      await client.query("DELETE FROM product_categories WHERE id = ANY($1::int[])", [created.categoryIds]);
    }

    if (created.locationIds.length) {
      await client.query("DELETE FROM warehouse_locations WHERE id = ANY($1::int[])", [created.locationIds]);
    }

    if (created.warehouseIds.length) {
      await client.query("DELETE FROM warehouses WHERE id = ANY($1::int[])", [created.warehouseIds]);
    }

    if (created.userIds.length) {
      await client.query("DELETE FROM users WHERE id = ANY($1::int[])", [created.userIds]);
    }

    await client.query(
      "DELETE FROM users WHERE email LIKE $1 OR email LIKE $2 OR email LIKE $3",
      [`${RUN_ID}%`, `%${RUN_ID}%`, `%${RUN_ID}%@coreinventory.local`]
    );

    await client.query(
      "DELETE FROM product_categories WHERE name LIKE $1",
      [`${RUN_ID}%`]
    );

    await client.query(
      "DELETE FROM products WHERE sku LIKE $1",
      [`${RUN_ID}%`]
    );

    await client.query(
      "DELETE FROM warehouse_locations WHERE code LIKE $1",
      [`${RUN_ID}%`]
    );

    await client.query(
      "DELETE FROM warehouses WHERE code LIKE $1",
      [`${RUN_ID}%`]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const adminEmail = `${RUN_ID}.admin@coreinventory.local`;
  const adminPassword = "SmokeAdmin123";
  const staffEmail = `${RUN_ID}.staff@coreinventory.local`;
  const staffPassword = "StaffPass123";
  const staffResetPassword = "StaffReset456";
  const staffFinalPassword = "StaffFinal789";
  const managerEmail = `${RUN_ID}.manager@coreinventory.local`;
  const managerPassword = "ManagerPass123";
  let server;

  try {
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const adminInsert = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id`,
      [`${RUN_ID} Admin`, adminEmail, adminHash]
    );
    created.userIds.push(adminInsert.rows[0].id);

    server = startServer(TEST_PORT);

    logStep("Waiting for health check");
    await waitForHealth(`${BASE_URL}/health`);

    logStep("Testing public signup and login");
    const signup = await api("/auth/signup", {
      method: "POST",
      body: {
        name: `${RUN_ID} Staff`,
        email: staffEmail,
        password: staffPassword,
        role: "warehouse_staff",
      },
      expectedStatus: 201,
    });
    created.userIds.push(signup.data.user.id);
    assert.equal(signup.data.user.role, "warehouse_staff");

    const staffLogin = await api("/auth/login", {
      method: "POST",
      body: { email: staffEmail, password: staffPassword },
    });
    const staffToken = staffLogin.data.token;

    logStep("Testing forgot-password OTP and authenticated password reset");
    const otpResponse = await api("/auth/forgot-password/request-otp", {
      method: "POST",
      body: { email: staffEmail },
    });
    assert.match(String(otpResponse.data.otp), /^\d{6}$/);

    await api("/auth/forgot-password/reset", {
      method: "POST",
      body: {
        email: staffEmail,
        otp: otpResponse.data.otp,
        new_password: staffResetPassword,
      },
    });

    const staffResetLogin = await api("/auth/login", {
      method: "POST",
      body: { email: staffEmail, password: staffResetPassword },
    });
    const staffResetToken = staffResetLogin.data.token;

    await api("/auth/reset-password", {
      method: "POST",
      token: staffResetToken,
      body: {
        current_password: staffResetPassword,
        new_password: staffFinalPassword,
      },
    });

    const staffFinalLogin = await api("/auth/login", {
      method: "POST",
      body: { email: staffEmail, password: staffFinalPassword },
    });
    const staffFinalToken = staffFinalLogin.data.token;

    const staffProfile = await api("/auth/profile", {
      token: staffFinalToken,
    });
    assert.equal(staffProfile.data.user.email, staffEmail);

    logStep("Testing admin login and user management");
    const adminLogin = await api("/auth/login", {
      method: "POST",
      body: { email: adminEmail, password: adminPassword },
    });
    const adminToken = adminLogin.data.token;

    await api("/auth/users", { token: adminToken });

    await api(`/auth/users/${adminInsert.rows[0].id}`, {
      method: "DELETE",
      token: adminToken,
      expectedStatus: 400,
    });

    const managerCreate = await api("/auth/users", {
      method: "POST",
      token: adminToken,
      body: {
        name: `${RUN_ID} Manager`,
        email: managerEmail,
        password: managerPassword,
        role: "inventory_manager",
      },
      expectedStatus: 201,
    });
    created.userIds.push(managerCreate.data.user.id);

    await api(`/auth/users/${managerCreate.data.user.id}`, {
      method: "PATCH",
      token: adminToken,
      body: { is_active: false },
    });

    await api(`/auth/users/${managerCreate.data.user.id}`, {
      method: "PATCH",
      token: adminToken,
      body: { is_active: true, role: "inventory_manager" },
    });

    await api(`/auth/users/${managerCreate.data.user.id}/reset-password`, {
      method: "POST",
      token: adminToken,
      body: { new_password: managerPassword },
    });

    const managerLogin = await api("/auth/login", {
      method: "POST",
      body: { email: managerEmail, password: managerPassword },
    });
    const managerToken = managerLogin.data.token;

    await api("/warehouses", {
      method: "POST",
      token: managerToken,
      body: { name: "Blocked Warehouse", code: `${RUN_ID}-BLOCKED` },
      expectedStatus: 403,
    });

    logStep("Testing categories, warehouses, and locations");
    const mainCategory = await api("/products/categories", {
      method: "POST",
      token: adminToken,
      body: {
        name: `${RUN_ID} Main Category`,
        description: "Primary category for smoke testing.",
      },
      expectedStatus: 201,
    });
    created.categoryIds.push(mainCategory.data.category.id);

    const disposableCategory = await api("/products/categories", {
      method: "POST",
      token: adminToken,
      body: {
        name: `${RUN_ID} Disposable Category`,
        description: "Deleted during smoke testing.",
      },
      expectedStatus: 201,
    });
    created.categoryIds.push(disposableCategory.data.category.id);

    const warehouseA = await api("/warehouses", {
      method: "POST",
      token: adminToken,
      body: {
        name: `${RUN_ID} Main Warehouse`,
        code: `${RUN_ID}-WHA`,
        address: "Alpha Street",
      },
      expectedStatus: 201,
    });
    created.warehouseIds.push(warehouseA.data.warehouse.id);

    const warehouseB = await api("/warehouses", {
      method: "POST",
      token: adminToken,
      body: {
        name: `${RUN_ID} Secondary Warehouse`,
        code: `${RUN_ID}-WHB`,
        address: "Beta Street",
      },
      expectedStatus: 201,
    });
    created.warehouseIds.push(warehouseB.data.warehouse.id);

    const warehouseTemp = await api("/warehouses", {
      method: "POST",
      token: adminToken,
      body: {
        name: `${RUN_ID} Temporary Warehouse`,
        code: `${RUN_ID}-TMP`,
        address: "Disposable Lane",
      },
      expectedStatus: 201,
    });
    created.warehouseIds.push(warehouseTemp.data.warehouse.id);

    const locationA1 = await api(`/warehouses/${warehouseA.data.warehouse.id}/locations`, {
      method: "POST",
      token: adminToken,
      body: { name: `${RUN_ID} Rack A1`, code: `${RUN_ID}-A1` },
      expectedStatus: 201,
    });
    created.locationIds.push(locationA1.data.location.id);

    const locationA2 = await api(`/warehouses/${warehouseA.data.warehouse.id}/locations`, {
      method: "POST",
      token: adminToken,
      body: { name: `${RUN_ID} Rack A2`, code: `${RUN_ID}-A2` },
      expectedStatus: 201,
    });
    created.locationIds.push(locationA2.data.location.id);

    const locationB1 = await api(`/warehouses/${warehouseB.data.warehouse.id}/locations`, {
      method: "POST",
      token: adminToken,
      body: { name: `${RUN_ID} Rack B1`, code: `${RUN_ID}-B1` },
      expectedStatus: 201,
    });
    created.locationIds.push(locationB1.data.location.id);

    const tempLocation = await api(`/warehouses/${warehouseTemp.data.warehouse.id}/locations`, {
      method: "POST",
      token: adminToken,
      body: { name: `${RUN_ID} Rack T1`, code: `${RUN_ID}-T1` },
      expectedStatus: 201,
    });
    created.locationIds.push(tempLocation.data.location.id);

    await api(`/warehouses/${warehouseA.data.warehouse.id}`, {
      method: "PUT",
      token: adminToken,
      body: {
        name: `${RUN_ID} Main Warehouse Updated`,
        code: `${RUN_ID}-WHA`,
        address: "Alpha Street Updated",
        is_active: true,
      },
    });

    await api(`/warehouses/locations/${locationA2.data.location.id}`, {
      method: "PUT",
      token: adminToken,
      body: {
        name: `${RUN_ID} Rack A2 Updated`,
        code: `${RUN_ID}-A2U`,
        is_active: true,
      },
    });

    const warehouseList = await api("/warehouses", { token: adminToken });
    assert.ok(warehouseList.data.warehouses.length >= 3);

    const locationList = await api(`/warehouses/${warehouseA.data.warehouse.id}/locations`, { token: adminToken });
    assert.equal(locationList.data.locations.length, 2);

    logStep("Testing product permissions and catalog CRUD");
    await api("/products", {
      method: "POST",
      token: staffFinalToken,
      body: {
        name: "Blocked Product",
        sku: `${RUN_ID}-BLOCKED`,
        unit_of_measure: "pcs",
      },
      expectedStatus: 403,
    });

    const productMain = await api("/products", {
      method: "POST",
      token: managerToken,
      body: {
        name: `${RUN_ID} Steel Rod`,
        sku: `${RUN_ID}-P1`,
        category_id: mainCategory.data.category.id,
        unit_of_measure: "pcs",
        reorder_level: 5,
      },
      expectedStatus: 201,
    });
    created.productIds.push(productMain.data.product.id);

    const productDisposable = await api("/products", {
      method: "POST",
      token: managerToken,
      body: {
        name: `${RUN_ID} Spare Item`,
        sku: `${RUN_ID}-P2`,
        category_id: disposableCategory.data.category.id,
        unit_of_measure: "pcs",
        reorder_level: 1,
      },
      expectedStatus: 201,
    });
    created.productIds.push(productDisposable.data.product.id);

    await api(`/products/${productMain.data.product.id}`, {
      method: "PUT",
      token: managerToken,
      body: {
        name: `${RUN_ID} Steel Rod Prime`,
        sku: `${RUN_ID}-P1`,
        category_id: mainCategory.data.category.id,
        unit_of_measure: "pcs",
        reorder_level: 8,
        is_active: true,
      },
    });

    const productSearch = await api(`/products?search=${encodeURIComponent(RUN_ID)}&category_id=${mainCategory.data.category.id}`, {
      token: adminToken,
    });
    assert.ok(productSearch.data.products.some((product) => product.sku === `${RUN_ID}-P1`));

    logStep("Testing receipts, stock increases, and ledger history");
    const receiptDraft = await api("/receipts", {
      method: "POST",
      token: staffFinalToken,
      body: {
        supplier_name: `${RUN_ID} Supplier`,
        warehouse_id: warehouseA.data.warehouse.id,
        location_id: locationA1.data.location.id,
        status: "draft",
        notes: "Draft receipt for validation path",
        items: [{ product_id: productMain.data.product.id, quantity: 20 }],
      },
      expectedStatus: 201,
    });
    created.receiptIds.push(receiptDraft.data.receipt.id);

    const receiptFetched = await api(`/receipts/${receiptDraft.data.receipt.id}`, { token: adminToken });
    assert.equal(receiptFetched.data.receipt.items.length, 1);

    await api(`/receipts/${receiptDraft.data.receipt.id}/validate`, {
      method: "POST",
      token: staffFinalToken,
    });

    const receiptImmediate = await api("/receipts", {
      method: "POST",
      token: managerToken,
      body: {
        supplier_name: `${RUN_ID} Supplier Fast`,
        warehouse_id: warehouseA.data.warehouse.id,
        location_id: locationA1.data.location.id,
        status: "validated",
        notes: "Immediate receipt validation path",
        items: [{ product_id: productMain.data.product.id, quantity: 5 }],
      },
      expectedStatus: 201,
    });
    created.receiptIds.push(receiptImmediate.data.receipt.id);

    let stockView = await api(`/products/stock?search=${encodeURIComponent(`${RUN_ID}-P1`)}`, { token: adminToken });
    const a1AfterReceipts = stockView.data.stock.find(
      (row) =>
        Number(row.warehouse_id) === warehouseA.data.warehouse.id &&
        Number(row.location_id) === locationA1.data.location.id &&
        row.sku === `${RUN_ID}-P1`
    );
    assert.ok(a1AfterReceipts);
    assert.equal(Number(a1AfterReceipts.quantity), 25);

    logStep("Testing deliveries and outbound stock flow");
    await api("/deliveries", {
      method: "POST",
      token: staffFinalToken,
      body: {
        customer_name: "Blocked Customer",
        warehouse_id: warehouseA.data.warehouse.id,
        location_id: locationA1.data.location.id,
        status: "draft",
        items: [{ product_id: productMain.data.product.id, quantity: 1 }],
      },
      expectedStatus: 403,
    });

    const delivery = await api("/deliveries", {
      method: "POST",
      token: managerToken,
      body: {
        customer_name: `${RUN_ID} Customer`,
        warehouse_id: warehouseA.data.warehouse.id,
        location_id: locationA1.data.location.id,
        status: "draft",
        notes: "Delivery workflow test",
        items: [{ product_id: productMain.data.product.id, quantity: 6 }],
      },
      expectedStatus: 201,
    });
    created.deliveryIds.push(delivery.data.delivery.id);

    const deliveryFetched = await api(`/deliveries/${delivery.data.delivery.id}`, { token: adminToken });
    assert.equal(deliveryFetched.data.delivery.items.length, 1);

    await api(`/deliveries/${delivery.data.delivery.id}/status`, {
      method: "PATCH",
      token: staffFinalToken,
      body: { status: "picked" },
    });
    await api(`/deliveries/${delivery.data.delivery.id}/status`, {
      method: "PATCH",
      token: staffFinalToken,
      body: { status: "packed" },
    });
    await api(`/deliveries/${delivery.data.delivery.id}/status`, {
      method: "PATCH",
      token: staffFinalToken,
      body: { status: "validated" },
    });

    stockView = await api(`/products/stock?search=${encodeURIComponent(`${RUN_ID}-P1`)}`, { token: adminToken });
    const a1AfterDelivery = stockView.data.stock.find(
      (row) =>
        Number(row.warehouse_id) === warehouseA.data.warehouse.id &&
        Number(row.location_id) === locationA1.data.location.id &&
        row.sku === `${RUN_ID}-P1`
    );
    assert.equal(Number(a1AfterDelivery.quantity), 19);

    logStep("Testing transfers and internal movement");
    const transfer = await api("/transfers", {
      method: "POST",
      token: staffFinalToken,
      body: {
        from_warehouse_id: warehouseA.data.warehouse.id,
        from_location_id: locationA1.data.location.id,
        to_warehouse_id: warehouseA.data.warehouse.id,
        to_location_id: locationA2.data.location.id,
        status: "draft",
        notes: "Transfer workflow test",
        items: [{ product_id: productMain.data.product.id, quantity: 4 }],
      },
      expectedStatus: 201,
    });
    created.transferIds.push(transfer.data.transfer.id);

    const transferFetched = await api(`/transfers/${transfer.data.transfer.id}`, { token: adminToken });
    assert.equal(transferFetched.data.transfer.items.length, 1);

    await api(`/transfers/${transfer.data.transfer.id}/validate`, {
      method: "POST",
      token: managerToken,
    });

    stockView = await api(`/products/stock?search=${encodeURIComponent(`${RUN_ID}-P1`)}`, { token: adminToken });
    const a1AfterTransfer = stockView.data.stock.find(
      (row) =>
        Number(row.warehouse_id) === warehouseA.data.warehouse.id &&
        Number(row.location_id) === locationA1.data.location.id &&
        row.sku === `${RUN_ID}-P1`
    );
    const a2AfterTransfer = stockView.data.stock.find(
      (row) =>
        Number(row.warehouse_id) === warehouseA.data.warehouse.id &&
        Number(row.location_id) === locationA2.data.location.id &&
        row.sku === `${RUN_ID}-P1`
    );
    assert.equal(Number(a1AfterTransfer.quantity), 15);
    assert.equal(Number(a2AfterTransfer.quantity), 4);

    logStep("Testing adjustments and low-stock history views");
    const adjustment = await api("/adjustments", {
      method: "POST",
      token: staffFinalToken,
      body: {
        warehouse_id: warehouseA.data.warehouse.id,
        location_id: locationA2.data.location.id,
        product_id: productMain.data.product.id,
        counted_quantity: 3,
        reason: "Cycle count variance",
      },
      expectedStatus: 201,
    });
    created.adjustmentIds.push(adjustment.data.adjustment.id);

    const adjustments = await api("/adjustments", { token: adminToken });
    assert.ok(adjustments.data.adjustments.some((item) => item.id === adjustment.data.adjustment.id));

    stockView = await api(`/products/stock?search=${encodeURIComponent(`${RUN_ID}-P1`)}`, { token: adminToken });
    const a2AfterAdjustment = stockView.data.stock.find(
      (row) =>
        Number(row.warehouse_id) === warehouseA.data.warehouse.id &&
        Number(row.location_id) === locationA2.data.location.id &&
        row.sku === `${RUN_ID}-P1`
    );
    assert.equal(Number(a2AfterAdjustment.quantity), 3);

    const history = await api(`/products/history?search=${encodeURIComponent(`${RUN_ID}-P1`)}`, { token: adminToken });
    const actionTypes = history.data.history.map((row) => row.action_type);
    assert.ok(actionTypes.includes("RECEIPT"));
    assert.ok(actionTypes.includes("DELIVERY"));
    assert.ok(actionTypes.includes("TRANSFER"));
    assert.ok(actionTypes.includes("ADJUSTMENT"));

    const dashboard = await api(`/dashboard?warehouse=${warehouseA.data.warehouse.id}&category=${mainCategory.data.category.id}`, {
      token: adminToken,
    });
    assert.ok(dashboard.data.kpis.total_products_in_stock >= 1);
    assert.ok(Array.isArray(dashboard.data.recent_activity));

    logStep("Testing deletions for unused entities");
    await api(`/products/${productDisposable.data.product.id}`, {
      method: "DELETE",
      token: managerToken,
    });
    created.productIds = created.productIds.filter((id) => id !== productDisposable.data.product.id);

    await api(`/products/categories/${disposableCategory.data.category.id}`, {
      method: "DELETE",
      token: adminToken,
    });
    created.categoryIds = created.categoryIds.filter((id) => id !== disposableCategory.data.category.id);

    await api(`/warehouses/locations/${tempLocation.data.location.id}`, {
      method: "DELETE",
      token: adminToken,
    });
    created.locationIds = created.locationIds.filter((id) => id !== tempLocation.data.location.id);

    await api(`/warehouses/${warehouseTemp.data.warehouse.id}`, {
      method: "DELETE",
      token: adminToken,
    });
    created.warehouseIds = created.warehouseIds.filter((id) => id !== warehouseTemp.data.warehouse.id);

    await api(`/auth/users/${managerCreate.data.user.id}`, {
      method: "DELETE",
      token: adminToken,
    });
    created.userIds = created.userIds.filter((id) => id !== managerCreate.data.user.id);

    logStep("Smoke test completed successfully");
  } finally {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
    await cleanup();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`[smoke] FAILED: ${error.message}`);
  process.exitCode = 1;
});
