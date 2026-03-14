// Transfers page logic for internal stock movements across warehouse locations.
(async function initTransfersPage() {
  if (document.body.dataset.page !== "transfers") {
    return;
  }

  const form = document.getElementById("transfer-form");
  const itemsContainer = document.getElementById("transfer-items");
  const addItemButton = document.getElementById("add-transfer-item");
  const refs = await window.CoreInventoryOperations.loadReferenceData();

  const warehouseOptions = refs.warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }));
  window.CoreInventoryUi.populateSelect(form.elements.from_warehouse_id, warehouseOptions, null);
  window.CoreInventoryUi.populateSelect(form.elements.to_warehouse_id, warehouseOptions, null);

  window.CoreInventoryOperations.bindWarehouseLocations(
    form.elements.from_warehouse_id,
    form.elements.from_location_id,
    refs.warehouses
  );
  window.CoreInventoryOperations.bindWarehouseLocations(
    form.elements.to_warehouse_id,
    form.elements.to_location_id,
    refs.warehouses
  );

  addItemButton.addEventListener("click", () => window.CoreInventoryOperations.addItemRow(itemsContainer, refs.products));
  window.CoreInventoryOperations.addItemRow(itemsContainer, refs.products);

  async function loadTransfers() {
    const response = await window.CoreInventoryApi.request("/transfers");
    document.getElementById("transfers-table").innerHTML = response.transfers.length
      ? `
        <table>
          <thead>
            <tr><th>Transfer</th><th>Route</th><th>Qty</th><th>Status</th><th>Created</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${response.transfers
              .map(
                (item) => `
                  <tr>
                    <td>${item.transfer_number}</td>
                    <td>${item.from_warehouse_name} / ${item.from_location_name}<br />to ${item.to_warehouse_name} / ${item.to_location_name}</td>
                    <td>${item.total_quantity}</td>
                    <td>${window.CoreInventoryUi.renderBadge(item.status)}</td>
                    <td>${window.CoreInventoryUi.formatDate(item.created_at)}</td>
                    <td>
                      ${
                        item.status === "draft"
                          ? `<button class="text-button" data-validate-transfer="${item.id}">Validate</button>`
                          : "-"
                      }
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
      : window.CoreInventoryUi.renderEmptyState("No transfers recorded yet.");

    document.querySelectorAll("[data-validate-transfer]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await window.CoreInventoryApi.request(`/transfers/${button.dataset.validateTransfer}/validate`, {
            method: "POST",
          });
          await loadTransfers();
        } catch (error) {
          window.CoreInventoryUi.setMessage("transfer-message", error.message, true);
        }
      });
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...window.CoreInventoryApi.formToObject(form),
        items: window.CoreInventoryOperations.extractItems(itemsContainer),
      };
      await window.CoreInventoryApi.request("/transfers", { method: "POST", body: payload });
      form.reset();
      itemsContainer.innerHTML = "";
      window.CoreInventoryUi.populateSelect(form.elements.from_warehouse_id, warehouseOptions, null);
      window.CoreInventoryUi.populateSelect(form.elements.to_warehouse_id, warehouseOptions, null);
      window.CoreInventoryOperations.bindWarehouseLocations(
        form.elements.from_warehouse_id,
        form.elements.from_location_id,
        refs.warehouses
      );
      window.CoreInventoryOperations.bindWarehouseLocations(
        form.elements.to_warehouse_id,
        form.elements.to_location_id,
        refs.warehouses
      );
      window.CoreInventoryOperations.addItemRow(itemsContainer, refs.products);
      window.CoreInventoryUi.setMessage("transfer-message", "Transfer saved successfully.");
      await loadTransfers();
    } catch (error) {
      window.CoreInventoryUi.setMessage("transfer-message", error.message, true);
    }
  });

  await loadTransfers();
})();
