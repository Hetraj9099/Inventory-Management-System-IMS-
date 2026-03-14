// Stock page logic for warehouse-level stock visibility and low stock filters.
(async function initStockPage() {
  if (document.body.dataset.page !== "stock") {
    return;
  }

  const filterForm = document.getElementById("stock-filter-form");
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

  async function loadStock() {
    const values = window.CoreInventoryApi.formToObject(filterForm);
    if (!filterForm.elements.lowStockOnly.checked) {
      delete values.lowStockOnly;
    }

    const query = window.CoreInventoryApi.toQueryString(values);
    const response = await window.CoreInventoryApi.request(`/products/stock${query ? `?${query}` : ""}`);

    document.getElementById("stock-table").innerHTML = response.stock.length
      ? `
        <table>
          <thead>
            <tr><th>Product</th><th>Warehouse</th><th>Location</th><th>Quantity</th><th>Reorder Level</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${response.stock
              .map(
                (row) => `
                  <tr>
                    <td>${row.product_name}<br /><small>${row.sku}</small></td>
                    <td>${row.warehouse_name}</td>
                    <td>${row.location_name}</td>
                    <td>${row.quantity} ${row.unit_of_measure}</td>
                    <td>${row.reorder_level}</td>
                    <td>${window.CoreInventoryUi.renderBadge(Number(row.quantity) <= Number(row.reorder_level) ? "low" : "healthy")}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
      : window.CoreInventoryUi.renderEmptyState("No stock records match the selected filters.");
  }

  filterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadStock();
  });

  await loadStock();
})();
