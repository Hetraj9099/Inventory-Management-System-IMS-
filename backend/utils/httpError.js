// Helper for creating HTTP-friendly errors inside services and controllers.
function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = httpError;
