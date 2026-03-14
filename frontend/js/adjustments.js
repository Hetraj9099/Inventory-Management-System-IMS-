// Adjustments page logic for stock count corrections.
(async function initAdjustmentsPage() {
  if (document.body.dataset.page !== "adjustments") {
    return;
  }

  const form = document.getElementById("adjustment-form");
  const [refs, productsResponse] = await Promise.all([
    window.CoreInventoryApi.request("/warehouses"),
    window.CoreInventoryApi.request("/products"),
  ]);

  window.CoreInventoryUi.populateSelect(
    form.elements.warehouse_id,
    refs.warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
    null
  );
  window.CoreInventoryUi.populateSelect(
    form.elements.product_id,
    productsResponse.products.map((product) => ({
      value: product.id,
      label: `${product.name} (${product.sku})`,
    })),
    null
  );
  window.CoreInventoryOperations.bindWarehouseLocations(
    form.elements.warehouse_id,
    form.elements.location_id,
    refs.warehouses
  );

  async function loadAdjustments() {
    const response = await window.CoreInventoryApi.request("/adjustments");
    document.getElementById("adjustments-table").innerHTML = response.adjustments.length
      ? `
        <table>
          <thead>
            <tr><th>Adjustment</th><th>Product</th><th>Warehouse</th><th>System</th><th>Counted</th><th>Delta</th><th>Created</th></tr>
          </thead>
          <tbody>
            ${response.adjustments
              .map(
                (item) => `
                  <tr>
                    <td>${item.adjustment_number}</td>
                    <td>${item.product_name}<br /><small>${item.sku}</small></td>
                    <td>${item.warehouse_name} / ${item.location_name}</td>
                    <td>${item.system_quantity}</td>
                    <td>${item.counted_quantity}</td>
                    <td>${item.adjustment_quantity}</td>
                    <td>${window.CoreInventoryUi.formatDate(item.created_at)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
      : window.CoreInventoryUi.renderEmptyState("No stock adjustments have been posted.");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await window.CoreInventoryApi.request("/adjustments", {
        method: "POST",
        body: window.CoreInventoryApi.formToObject(form),
      });
      form.reset();
      window.CoreInventoryOperations.bindWarehouseLocations(
        form.elements.warehouse_id,
        form.elements.location_id,
        refs.warehouses
      );
      window.CoreInventoryUi.setMessage("adjustment-message", "Adjustment saved successfully.");
      await loadAdjustments();
    } catch (error) {
      window.CoreInventoryUi.setMessage("adjustment-message", error.message, true);
    }
  });

  await loadAdjustments();
})();