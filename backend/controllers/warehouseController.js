// Placeholder controller for future warehouse and location management actions.
function getWarehousesPlaceholder(_req, res) {
  res.status(501).json({ message: "Warehouses module scaffolded but not implemented yet." });
}

module.exports = {
  getWarehousesPlaceholder,
};
