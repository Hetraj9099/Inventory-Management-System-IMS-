// Move history page logic for stock ledger filtering and display.
(async function initHistoryPage() {
  if (document.body.dataset.page !== "history") {
    return;
  }

  const filterForm = document.getElementById("history-filter-form");
  const [warehousesResponse, categoriesResponse] = await Promise.all([
    window.CoreInventoryApi.request("/warehouses"),
    window.CoreInventoryApi.request("/products/categories"),
  ]);

  window.CoreInventoryUi.populateSelect(
    filterForm.elements.warehouseId,
    warehousesResponse.warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
    "All Warehouses"
  );

  window.CoreInventoryUi.populateSelect(
    filterForm.elements.categoryId,
    categoriesResponse.categories.map((category) => ({ value: category.id, label: category.name })),
    "All Categories"
  );

  async function loadHistory() {
    const query = window.CoreInventoryApi.toQueryString(window.CoreInventoryApi.formToObject(filterForm));
    const response = await window.CoreInventoryApi.request(`/products/history${query ? `?${query}` : ""}`);

    document.getElementById("history-table").innerHTML = response.history.length
      ? `
        <table>
          <thead>
            <tr><th>Action</th><th>Product</th><th>Change</th><th>After</th><th>Reference</th><th>Warehouse</th><th>Time</th></tr>
          </thead>
          <tbody>
            ${response.history
              .map(
                (row) => `
                  <tr>
                    <td>${window.CoreInventoryUi.renderBadge(row.action_type)}</td>
                    <td>${row.product_name}<br /><small>${row.sku}</small></td>
                    <td>${row.quantity_change}</td>
                    <td>${row.quantity_after}</td>
                    <td>${row.reference_type} #${row.reference_id}</td>
                    <td>${row.warehouse_name} / ${row.location_name}</td>
                    <td>${window.CoreInventoryUi.formatDate(row.created_at)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
      : window.CoreInventoryUi.renderEmptyState("No ledger activity matches the selected filters.");
  }

  filterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadHistory();
  });

  await loadHistory();
})();
