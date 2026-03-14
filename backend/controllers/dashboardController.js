// Placeholder controller for future dashboard metrics and alert summaries.
function getDashboardPlaceholder(_req, res) {
  res.status(501).json({ message: "Dashboard module scaffolded but not implemented yet." });
}

module.exports = {
  getDashboardPlaceholder,
};
