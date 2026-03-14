-- Placeholder database schema plan for the CoreInventory application.
-- PostgreSQL is the primary target, with optional MySQL-compatible design where practical.

-- users table placeholder
-- CREATE TABLE users (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(100) NOT NULL,
--   email VARCHAR(150) UNIQUE NOT NULL,
--   password_hash TEXT NOT NULL,
--   role VARCHAR(50) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- products table placeholder
-- CREATE TABLE products (
--   id SERIAL PRIMARY KEY,
--   sku VARCHAR(100) UNIQUE NOT NULL,
--   name VARCHAR(150) NOT NULL,
--   description TEXT,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- warehouses table placeholder
-- CREATE TABLE warehouses (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(150) NOT NULL,
--   code VARCHAR(50) UNIQUE NOT NULL,
--   location_description TEXT
-- );

-- stock table placeholder
-- CREATE TABLE stock (
--   id SERIAL PRIMARY KEY,
--   product_id INTEGER NOT NULL,
--   warehouse_id INTEGER NOT NULL,
--   quantity NUMERIC(12, 2) NOT NULL DEFAULT 0
-- );

-- stock_ledger table placeholder
-- CREATE TABLE stock_ledger (
--   id SERIAL PRIMARY KEY,
--   product_id INTEGER NOT NULL,
--   warehouse_id INTEGER NOT NULL,
--   movement_type VARCHAR(50) NOT NULL,
--   quantity NUMERIC(12, 2) NOT NULL,
--   reference_type VARCHAR(50),
--   reference_id INTEGER,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- receipts table placeholder
-- CREATE TABLE receipts (
--   id SERIAL PRIMARY KEY,
--   receipt_number VARCHAR(100) UNIQUE NOT NULL,
--   warehouse_id INTEGER NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- deliveries table placeholder
-- CREATE TABLE deliveries (
--   id SERIAL PRIMARY KEY,
--   delivery_number VARCHAR(100) UNIQUE NOT NULL,
--   warehouse_id INTEGER NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- transfers table placeholder
-- CREATE TABLE transfers (
--   id SERIAL PRIMARY KEY,
--   transfer_number VARCHAR(100) UNIQUE NOT NULL,
--   from_warehouse_id INTEGER NOT NULL,
--   to_warehouse_id INTEGER NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- adjustments table placeholder
-- CREATE TABLE adjustments (
--   id SERIAL PRIMARY KEY,
--   adjustment_number VARCHAR(100) UNIQUE NOT NULL,
--   warehouse_id INTEGER NOT NULL,
--   reason TEXT,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
