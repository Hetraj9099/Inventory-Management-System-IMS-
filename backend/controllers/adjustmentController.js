// Placeholder controller for future stock adjustment workflows.
function getAdjustmentsPlaceholder(_req, res) {
  res.status(501).json({ message: "Adjustments module scaffolded but not implemented yet." });
}

module.exports = {
  getAdjustmentsPlaceholder,
};
