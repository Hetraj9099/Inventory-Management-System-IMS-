// Deliveries page logic for outbound orders, pick-pack-progress, and validation.
(async function initDeliveriesPage() {
  if (document.body.dataset.page !== "deliveries") {
    return;
  }

  const form = document.getElementById("delivery-form");
  const itemsContainer = document.getElementById("delivery-items");
  const addItemButton = document.getElementById("add-delivery-item");
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

  function nextStatus(status) {
    if (status === "draft") return "picked";
    if (status === "picked") return "packed";
    if (status === "packed") return "validated";
    return null;
  }

  async function loadDeliveries() {
    const response = await window.CoreInventoryApi.request("/deliveries");
    document.getElementById("deliveries-table").innerHTML = response.deliveries.length
      ? `
        <table>
          <thead>
            <tr><th>Delivery</th><th>Customer</th><th>Warehouse</th><th>Qty</th><th>Status</th><th>Created</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${response.deliveries
              .map((item) => {
                const action = nextStatus(item.status);
                return `
                  <tr>
                    <td>${item.delivery_number}</td>
                    <td>${item.customer_name}</td>
                    <td>${item.warehouse_name} / ${item.location_name}</td>
                    <td>${item.total_quantity}</td>
                    <td>${window.CoreInventoryUi.renderBadge(item.status)}</td>
                    <td>${window.CoreInventoryUi.formatDate(item.created_at)}</td>
                    <td>
                      ${
                        action
                          ? `<button class="text-button" data-delivery-id="${item.id}" data-next-status="${action}">${action}</button>`
                          : "-"
                      }
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      `
      : window.CoreInventoryUi.renderEmptyState("No delivery orders created yet.");

    document.querySelectorAll("[data-delivery-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await window.CoreInventoryApi.request(`/deliveries/${button.dataset.deliveryId}/status`, {
            method: "PATCH",
            body: { status: button.dataset.nextStatus },
          });
          await loadDeliveries();
        } catch (error) {
          window.CoreInventoryUi.setMessage("delivery-message", error.message, true);
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
      await window.CoreInventoryApi.request("/deliveries", { method: "POST", body: payload });
      form.reset();
      itemsContainer.innerHTML = "";
      window.CoreInventoryOperations.bindWarehouseLocations(
        form.elements.warehouse_id,
        form.elements.location_id,
        refs.warehouses
      );
      window.CoreInventoryOperations.addItemRow(itemsContainer, refs.products);
      window.CoreInventoryUi.setMessage("delivery-message", "Delivery order saved successfully.");
      await loadDeliveries();
    } catch (error) {
      window.CoreInventoryUi.setMessage("delivery-message", error.message, true);
    }
  });

  await loadDeliveries();
})();
