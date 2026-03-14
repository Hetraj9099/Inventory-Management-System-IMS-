// Placeholder authentication middleware for future token/session validation.
function authMiddleware(_req, _res, next) {
  next();
}

module.exports = authMiddleware;
