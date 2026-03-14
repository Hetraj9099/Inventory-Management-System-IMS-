// Express server entry point for the CoreInventory API and static frontend.
require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const transferRoutes = require("./routes/transferRoutes");
const adjustmentRoutes = require("./routes/adjustmentRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { errorHandler, notFoundHandler } = require("./middleware/errorMiddleware");
const db = require("./db");

const app = express();
const frontendPath = path.join(__dirname, "..", "frontend");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(frontendPath));

app.get("/api/health", (_req, res) => {
  res.json({ message: "CoreInventory backend is running.", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/adjustments", adjustmentRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use(notFoundHandler);
app.use(errorHandler);

function startServer(port = process.env.PORT || 5000) {
  const listener = app.listen(port, () => {
    console.log(`CoreInventory server listening on http://localhost:${port}`);

    db.query("SELECT 1")
      .then(() => {
        console.log("PostgreSQL connection check passed.");
      })
      .catch((error) => {
        console.error("PostgreSQL connection check failed:", error.code || error.message);
      });
  });

  return listener;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
};
