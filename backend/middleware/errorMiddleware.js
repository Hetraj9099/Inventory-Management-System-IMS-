// Central error middleware for returning consistent API responses.
function notFoundHandler(_req, res) {
  return res.status(404).json({ message: "Requested resource was not found." });
}

function resolveDatabaseMessage(error) {
  if (error?.code === "ECONNREFUSED" || error?.[errorsSymbol]?.some((item) => item?.code === "ECONNREFUSED")) {
    return "Database connection failed. Make sure PostgreSQL is running on the configured host and port.";
  }

  if (error?.code === "3D000") {
    return "Database was not found. Create the configured PostgreSQL database before using the app.";
  }

  if (error?.code === "28P01") {
    return "Database authentication failed. Check DB_USER and DB_PASSWORD in your .env file.";
  }

  if (error?.code === "42P01") {
    return "Database tables are missing. Run database/schema.sql before using the app.";
  }

  return null;
}

const errorsSymbol = "errors";

function errorHandler(error, _req, res, _next) {
  const databaseMessage = resolveDatabaseMessage(error);
  const status = databaseMessage ? 503 : error.status || 500;
  const message = databaseMessage || error.message || "Unexpected server error.";

  console.error("CoreInventory error:", {
    message: error.message,
    code: error.code,
    status,
  });

  return res.status(status).json({
    message,
    details: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
