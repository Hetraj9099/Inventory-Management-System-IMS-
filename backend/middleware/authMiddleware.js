// JWT authentication middleware for protecting CoreInventory API routes.
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

async function authMiddleware(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";
  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "coreinventory-secret");
    const currentUser = await userModel.findById(decoded.id);

    if (!currentUser || !currentUser.is_active) {
      return res.status(401).json({ message: "Your account is no longer available for this session." });
    }

    req.user = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      is_active: currentUser.is_active,
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired authentication token." });
  }
}

module.exports = authMiddleware;