// Placeholder controller for future incoming goods receipt workflows.
function getReceiptsPlaceholder(_req, res) {
  res.status(501).json({ message: "Receipts module scaffolded but not implemented yet." });
}

module.exports = {
  getReceiptsPlaceholder,
};
