-- Demo seed data for CoreInventory.
-- Users are intentionally not pre-seeded so the first signup can become admin.

INSERT INTO product_categories (name, description)
VALUES
  ('Raw Materials', 'Materials used in production and assembly'),
  ('Finished Goods', 'Sellable inventory ready for dispatch'),
  ('Maintenance', 'Maintenance and warehouse support items')
ON CONFLICT (name) DO NOTHING;

INSERT INTO warehouses (name, code, address)
VALUES
  ('Main Warehouse', 'MAIN', 'Industrial Zone, Block A'),
  ('Production Floor', 'PROD', 'Factory Building, Level 1')
ON CONFLICT (code) DO NOTHING;

INSERT INTO warehouse_locations (warehouse_id, name, code)
SELECT w.id, location_name, location_code
FROM (
  VALUES
    ('MAIN', 'Receiving Bay', 'RCV'),
    ('MAIN', 'Rack A', 'RACK-A'),
    ('PROD', 'Assembly Line', 'LINE-1'),
    ('PROD', 'Dispatch Area', 'DSP')
) AS seed(warehouse_code, location_name, location_code)
JOIN warehouses w ON w.code = seed.warehouse_code
ON CONFLICT (warehouse_id, code) DO NOTHING;

INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
SELECT seed.name, seed.sku, pc.id, seed.unit_of_measure, seed.reorder_level
FROM (
  VALUES
    ('Steel Rod', 'STL-001', 'Raw Materials', 'pcs', 30),
    ('Office Chair', 'CHR-002', 'Finished Goods', 'pcs', 10),
    ('Packing Tape', 'PKG-003', 'Maintenance', 'roll', 15)
) AS seed(name, sku, category_name, unit_of_measure, reorder_level)
JOIN product_categories pc ON pc.name = seed.category_name
ON CONFLICT (sku) DO NOTHING;

INSERT INTO stock (product_id, warehouse_id, location_id, quantity)
SELECT p.id, w.id, wl.id, seed.quantity
FROM (
  VALUES
    ('STL-001', 'MAIN', 'RCV', 120),
    ('CHR-002', 'MAIN', 'RACK-A', 24),
    ('PKG-003', 'PROD', 'DSP', 8)
) AS seed(sku, warehouse_code, location_code, quantity)
JOIN products p ON p.sku = seed.sku
JOIN warehouses w ON w.code = seed.warehouse_code
JOIN warehouse_locations wl ON wl.warehouse_id = w.id AND wl.code = seed.location_code
ON CONFLICT (product_id, warehouse_id, location_id) DO NOTHING;