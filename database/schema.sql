-- PostgreSQL schema for the CoreInventory inventory management system.
-- Run this file in a local PostgreSQL database before starting the API.

DROP TABLE IF EXISTS stock_ledger CASCADE;
DROP TABLE IF EXISTS adjustments CASCADE;
DROP TABLE IF EXISTS transfer_items CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS delivery_items CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS receipt_items CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS warehouse_locations CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS password_reset_otps CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- users table stores platform accounts and RBAC roles.
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL CHECK (role IN ('admin', 'inventory_manager', 'warehouse_staff')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- password_reset_otps table stores temporary OTP codes for forgot-password recovery.
CREATE TABLE password_reset_otps (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- warehouses table stores high-level warehouse entities.
CREATE TABLE warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- warehouse_locations table stores racks, staging zones, or sub-locations inside warehouses.
CREATE TABLE warehouse_locations (
  id SERIAL PRIMARY KEY,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (warehouse_id, code)
);

-- product_categories table supports admin-controlled category lists.
CREATE TABLE product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- products table stores product master data and reorder levels.
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
  unit_of_measure VARCHAR(40) NOT NULL,
  reorder_level NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- stock table stores current stock balances by product and warehouse location.
CREATE TABLE stock (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES warehouse_locations(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, warehouse_id, location_id)
);

-- receipts table stores incoming goods documents.
CREATE TABLE receipts (
  id SERIAL PRIMARY KEY,
  receipt_number VARCHAR(100) UNIQUE NOT NULL,
  supplier_name VARCHAR(150) NOT NULL,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  location_id INTEGER NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  validated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- receipt_items table stores product lines for each receipt.
CREATE TABLE receipt_items (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0)
);

-- deliveries table stores outbound delivery orders.
CREATE TABLE deliveries (
  id SERIAL PRIMARY KEY,
  delivery_number VARCHAR(100) UNIQUE NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  location_id INTEGER NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'picked', 'packed', 'validated')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  validated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- delivery_items table stores product lines for each delivery.
CREATE TABLE delivery_items (
  id SERIAL PRIMARY KEY,
  delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0)
);

-- transfers table stores internal stock movement documents.
CREATE TABLE transfers (
  id SERIAL PRIMARY KEY,
  transfer_number VARCHAR(100) UNIQUE NOT NULL,
  from_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  from_location_id INTEGER NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  to_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_location_id INTEGER NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  validated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- transfer_items table stores product lines for each transfer.
CREATE TABLE transfer_items (
  id SERIAL PRIMARY KEY,
  transfer_id INTEGER NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0)
);

-- adjustments table stores stock count corrections.
CREATE TABLE adjustments (
  id SERIAL PRIMARY KEY,
  adjustment_number VARCHAR(100) UNIQUE NOT NULL,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  location_id INTEGER NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  system_quantity NUMERIC(12, 2) NOT NULL,
  counted_quantity NUMERIC(12, 2) NOT NULL,
  adjustment_quantity NUMERIC(12, 2) NOT NULL,
  reason TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- stock_ledger table records every inventory movement for auditability.
CREATE TABLE stock_ledger (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(30) NOT NULL CHECK (action_type IN ('RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT')),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  location_id INTEGER NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  quantity_change NUMERIC(12, 2) NOT NULL,
  quantity_after NUMERIC(12, 2) NOT NULL,
  reference_type VARCHAR(30) NOT NULL,
  reference_id INTEGER NOT NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_stock_product_id ON stock(product_id);
CREATE INDEX idx_stock_warehouse_id ON stock(warehouse_id);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_ledger_product_id ON stock_ledger(product_id);
CREATE INDEX idx_ledger_created_at ON stock_ledger(created_at DESC);
