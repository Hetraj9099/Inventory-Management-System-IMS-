// Placeholder controller for future outbound delivery order workflows.
function getDeliveriesPlaceholder(_req, res) {
  res.status(501).json({ message: "Deliveries module scaffolded but not implemented yet." });
}

module.exports = {
  getDeliveriesPlaceholder,
};
