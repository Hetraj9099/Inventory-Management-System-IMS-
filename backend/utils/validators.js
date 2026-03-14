// Shared validation helpers placeholder for future request and payload checks.
function validateRequiredFields(requiredFields, payload) {
  const missingFields = requiredFields.filter((field) => payload[field] === undefined);

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

module.exports = {
  validateRequiredFields,
};
