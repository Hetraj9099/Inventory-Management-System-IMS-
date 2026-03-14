// Receipts page logic for incoming stock creation and validation.
(async function initReceiptsPage() {
  if (document.body.dataset.page !== "receipts") {
    return;
  }

  const form = document.getElementById("receipt-form");
  const itemsContainer = document.getElementById("receipt-items");
  const addItemButton = document.getElementById("add-receipt-item");
  const refs = await window.CoreInventoryOperations.loadReferenceData();

  window.CoreInventoryUi.populateSelect(
    form.elements.warehouse_id,
    refs.warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
    null
  );
  window.CoreInventoryOperations.bindWarehouseLocations(
    form.elements.warehouse_id,
    form.elements.location_id,
    refs.warehouses
  );

  addItemButton.addEventListener("click", () => window.CoreInventoryOperations.addItemRow(itemsContainer, refs.products));
  window.CoreInventoryOperations.addItemRow(itemsContainer, refs.products);

  async function loadReceipts() {
    const response = await window.CoreInventoryApi.request("/receipts");
    document.getElementById("receipts-table").innerHTML = response.receipts.length
      ? `
        <table>
          <thead>
            <tr><th>Receipt</th><th>Supplier</th><th>Warehouse</th><th>Qty</th><th>Status</th><th>Created</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${response.receipts
              .map(
                (item) => `
                  <tr>
                    <td>${item.receipt_number}</td>
                    <td>${item.supplier_name}</td>
                    <td>${item.warehouse_name} / ${item.location_name}</td>
                    <td>${item.total_quantity}</td>
                    <td>${window.CoreInventoryUi.renderBadge(item.status)}</td>
                    <td>${window.CoreInventoryUi.formatDate(item.created_at)}</td>
                    <td>
                      ${
                        item.status === "draft"
                          ? `<button class="text-button" data-validate-receipt="${item.id}">Validate</button>`
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
      : window.CoreInventoryUi.renderEmptyState("No receipts recorded yet.");

    document.querySelectorAll("[data-validate-receipt]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await window.CoreInventoryApi.request(`/receipts/${button.dataset.validateReceipt}/validate`, {
            method: "POST",
          });
          await loadReceipts();
        } catch (error) {
          window.CoreInventoryUi.setMessage("receipt-message", error.message, true);
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
      await window.CoreInventoryApi.request("/receipts", { method: "POST", body: payload });
      form.reset();
      itemsContainer.innerHTML = "";
      window.CoreInventoryOperations.bindWarehouseLocations(
        form.elements.warehouse_id,
        form.elements.location_id,
        refs.warehouses
      );
      window.CoreInventoryOperations.addItemRow(itemsContainer, refs.products);
      window.CoreInventoryUi.setMessage("receipt-message", "Receipt saved successfully.");
      await loadReceipts();
    } catch (error) {
      window.CoreInventoryUi.setMessage("receipt-message", error.message, true);
    }
  });

  await loadReceipts();
})();
