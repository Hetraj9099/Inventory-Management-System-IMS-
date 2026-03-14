// Shared validation helpers for request payloads and query values.
function validateRequiredFields(requiredFields, payload) {
  const missingFields = requiredFields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || value === "";
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isPositiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function isNonNegativeNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureOperationItems(items) {
  const normalizedItems = ensureArray(items).map((item) => ({
    product_id: Number(item.product_id),
    quantity: Number(item.quantity),
  }));

  const hasInvalidItem = normalizedItems.some(
    (item) => !Number.isInteger(item.product_id) || !isPositiveNumber(item.quantity)
  );

  return {
    valid: normalizedItems.length > 0 && !hasInvalidItem,
    items: normalizedItems,
  };
}

function parsePagination(query) {
  const limit = Math.min(Number(query.limit) || 20, 100);
  const offset = Math.max(Number(query.offset) || 0, 0);

  return { limit, offset };
}

module.exports = {
  validateRequiredFields,
  isEmail,
  isPositiveNumber,
  isNonNegativeNumber,
  ensureArray,
  ensureOperationItems,
  parsePagination,
};