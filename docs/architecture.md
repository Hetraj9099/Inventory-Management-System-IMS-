<!-- Architecture notes for the CoreInventory hackathon MVP. -->
# CoreInventory Architecture

## Backend

- `server.js` boots the Express app, mounts API modules, and serves the static frontend.
- `routes/` keeps the REST surface separated by domain: auth, products, warehouses, receipts, deliveries, transfers, adjustments, and dashboard.
- `controllers/` handle HTTP validation and orchestration.
- `models/` contain SQL queries and persistence concerns.
- `services/inventoryService.js` centralizes transactional stock updates and stock ledger creation.
- `middleware/` contains JWT authentication, RBAC checks, and shared error handling.

## Frontend

- Vanilla HTML pages map to the primary demo screens judges will navigate quickly.
- `layout.js` renders a shared sidebar and topbar using the authenticated session.
- Each page script calls the REST API directly and renders lightweight tables/forms without frameworks.
- `operations.js` provides shared helpers for warehouse-location select behavior and line-item forms.

## Database

- PostgreSQL is the primary runtime database.
- Core transactional tables include `receipts`, `deliveries`, `transfers`, `adjustments`, and `stock_ledger`.
- The `stock` table stores the current balance by product and warehouse location.
- The `stock_ledger` table stores the immutable history of every stock movement for traceability.

## Hackathon Team Split

- Member 1: `auth`, `middleware`, `settings`
- Member 2: `products`, `stock`, `history`
- Member 3: `receipts`, `deliveries`, `transfers`, `adjustments`
- Member 4: `dashboard`, analytics, polish, and demo scripting
