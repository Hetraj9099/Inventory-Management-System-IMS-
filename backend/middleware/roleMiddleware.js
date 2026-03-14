// Placeholder role-based authorization middleware for future access control rules.
function roleMiddleware(..._allowedRoles) {
  return (_req, _res, next) => {
    next();
  };
}

module.exports = roleMiddleware;
