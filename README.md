<!-- Project README for setting up and demonstrating the CoreInventory hackathon MVP. -->
# CoreInventory

CoreInventory is a full-stack Inventory Management System built for hackathon demos with Node.js, Express, PostgreSQL, and vanilla HTML/CSS/JavaScript.

## What It Covers

- JWT authentication with role-based access control
- Admin, Inventory Manager, and Warehouse Staff roles
- Product catalog and category management
- Multi-warehouse and location-based stock tracking
- Receipts, delivery orders, transfers, and stock adjustments
- Real-time stock balances and full movement history
- Dashboard KPIs, low stock alerts, and demo-friendly UI

## Project Structure

```text
coreinventory/
├── backend/
├── frontend/
├── database/
├── docs/
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

```bash
npm install
```

1. Create a PostgreSQL database named `coreinventory`.
2. Copy `.env.example` to `.env` and update credentials if needed.
3. Run `database/schema.sql` against your database.
4. Optional: run `database/seed.sql` for demo data.
5. Start the app:

```bash
npm start
```

The server runs on `http://localhost:5000` and also serves the frontend pages.

## Demo Notes

- The first signup becomes the Admin account automatically.
- Additional users can be created from the Admin-only Settings page.
- Seed data includes sample categories, warehouses, locations, products, and stock balances.
- PostgreSQL is the primary database target, while MySQL placeholders remain in config for future compatibility work.
