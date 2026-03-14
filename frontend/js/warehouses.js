// Warehouses page logic for admin warehouse and location management.
(async function initWarehousesPage() {
  if (document.body.dataset.page !== "warehouses") {
    return;
  }

  const session = window.CoreInventoryUi.session;
  if (session.user.role !== "admin") {
    window.location.href = "./dashboard.html";
    return;
  }

  const warehouseForm = document.getElementById("warehouse-form");
  const warehouseResetButton = document.getElementById("warehouse-form-reset");
  const locationForm = document.getElementById("location-form");
  const locationResetButton = document.getElementById("location-form-reset");
  const warehouseSelect = document.getElementById("location-warehouse-select");

  let warehouses = [];

  function normalizeCheckbox(form, name) {
    return form.elements[name].checked;
  }

  function resetWarehouseForm() {
    warehouseForm.reset();
    warehouseForm.elements.id.value = "";
    warehouseForm.elements.is_active.checked = true;
  }

  function resetLocationForm() {
    locationForm.reset();
    locationForm.elements.id.value = "";
    locationForm.elements.is_active.checked = true;
  }

  function getSelectedWarehouse() {
    return warehouses.find((warehouse) => String(warehouse.id) === String(warehouseSelect.value)) || null;
  }

  async function loadLocationsTable() {
    const selectedWarehouse = getSelectedWarehouse();
    const table = document.getElementById("locations-table");

    if (!selectedWarehouse) {
      table.innerHTML = window.CoreInventoryUi.renderEmptyState("Create a warehouse first to manage its locations.");
      return;
    }

    const locations = selectedWarehouse.locations || [];

    table.innerHTML = locations.length
      ? `
        <table>
          <thead>
            <tr><th>Name</th><th>Code</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${locations
              .map(
                (location) => `
                  <tr>
                    <td>${location.name}</td>
                    <td>${location.code}</td>
                    <td>${window.CoreInventoryUi.renderBadge(location.is_active ? "active" : "inactive")}</td>
                    <td>
                      <button class="text-button" data-edit-location="${location.id}">Edit</button>
                      <button class="text-button" data-delete-location="${location.id}">Delete</button>
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
      : window.CoreInventoryUi.renderEmptyState("No locations added for this warehouse yet.");

    document.querySelectorAll("[data-edit-location]").forEach((button) => {
      button.addEventListener("click", () => {
        const location = locations.find((item) => String(item.id) === button.dataset.editLocation);
        if (!location) {
          return;
        }

        locationForm.elements.id.value = location.id;
        locationForm.elements.name.value = location.name;
        locationForm.elements.code.value = location.code;
        locationForm.elements.is_active.checked = Boolean(location.is_active);
        window.CoreInventoryUi.setMessage("location-message", `Editing location ${location.name}.`);
      });
    });

    document.querySelectorAll("[data-delete-location]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!window.confirm("Delete this location?")) {
          return;
        }

        try {
          await window.CoreInventoryApi.request(`/warehouses/locations/${button.dataset.deleteLocation}`, {
            method: "DELETE",
          });
          resetLocationForm();
          window.CoreInventoryUi.setMessage("location-message", "Location deleted successfully.");
          await loadWarehouses();
        } catch (error) {
          window.CoreInventoryUi.setMessage("location-message", error.message, true);
        }
      });
    });
  }

  async function loadWarehouses() {
    const response = await window.CoreInventoryApi.request("/warehouses");
    warehouses = response.warehouses || [];

    const previousValue = warehouseSelect.value;
    window.CoreInventoryUi.populateSelect(
      warehouseSelect,
      warehouses.map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.name} (${warehouse.code})`,
      })),
      null
    );

    if (previousValue && warehouses.some((warehouse) => String(warehouse.id) === String(previousValue))) {
      warehouseSelect.value = previousValue;
    }

    if (!warehouseSelect.value && warehouses[0]) {
      warehouseSelect.value = warehouses[0].id;
    }

    document.getElementById("warehouses-table").innerHTML = warehouses.length
      ? `
        <table>
          <thead>
            <tr><th>Name</th><th>Code</th><th>Address</th><th>Locations</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${warehouses
              .map(
                (warehouse) => `
                  <tr>
                    <td>${warehouse.name}</td>
                    <td>${warehouse.code}</td>
                    <td>${warehouse.address || "-"}</td>
                    <td>${(warehouse.locations || []).length}</td>
                    <td>${window.CoreInventoryUi.renderBadge(warehouse.is_active ? "active" : "inactive")}</td>
                    <td>
                      <button class="text-button" data-edit-warehouse="${warehouse.id}">Edit</button>
                      <button class="text-button" data-focus-warehouse="${warehouse.id}">Locations</button>
                      <button class="text-button" data-delete-warehouse="${warehouse.id}">Delete</button>
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
      : window.CoreInventoryUi.renderEmptyState("No warehouses created yet.");

    document.querySelectorAll("[data-edit-warehouse]").forEach((button) => {
      button.addEventListener("click", () => {
        const warehouse = warehouses.find((item) => String(item.id) === button.dataset.editWarehouse);
        if (!warehouse) {
          return;
        }

        warehouseForm.elements.id.value = warehouse.id;
        warehouseForm.elements.name.value = warehouse.name;
        warehouseForm.elements.code.value = warehouse.code;
        warehouseForm.elements.address.value = warehouse.address || "";
        warehouseForm.elements.is_active.checked = Boolean(warehouse.is_active);
        window.CoreInventoryUi.setMessage("warehouse-message", `Editing warehouse ${warehouse.name}.`);
      });
    });

    document.querySelectorAll("[data-focus-warehouse]").forEach((button) => {
      button.addEventListener("click", async () => {
        warehouseSelect.value = button.dataset.focusWarehouse;
        resetLocationForm();
        await loadLocationsTable();
      });
    });

    document.querySelectorAll("[data-delete-warehouse]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!window.confirm("Delete this warehouse? This only works if it is not referenced by stock or documents.")) {
          return;
        }

        try {
          await window.CoreInventoryApi.request(`/warehouses/${button.dataset.deleteWarehouse}`, {
            method: "DELETE",
          });
          resetWarehouseForm();
          resetLocationForm();
          window.CoreInventoryUi.setMessage("warehouse-message", "Warehouse deleted successfully.");
          await loadWarehouses();
        } catch (error) {
          window.CoreInventoryUi.setMessage("warehouse-message", error.message, true);
        }
      });
    });

    await loadLocationsTable();
  }

  warehouseSelect.addEventListener("change", async () => {
    resetLocationForm();
    await loadLocationsTable();
  });

  warehouseForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const warehouseId = warehouseForm.elements.id.value;
    const payload = {
      name: warehouseForm.elements.name.value,
      code: warehouseForm.elements.code.value,
      address: warehouseForm.elements.address.value,
      is_active: normalizeCheckbox(warehouseForm, "is_active"),
    };

    try {
      await window.CoreInventoryApi.request(
        warehouseId ? `/warehouses/${warehouseId}` : "/warehouses",
        {
          method: warehouseId ? "PUT" : "POST",
          body: payload,
        }
      );

      window.CoreInventoryUi.setMessage(
        "warehouse-message",
        warehouseId ? "Warehouse updated successfully." : "Warehouse created successfully."
      );
      resetWarehouseForm();
      await loadWarehouses();
    } catch (error) {
      window.CoreInventoryUi.setMessage("warehouse-message", error.message, true);
    }
  });

  locationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const selectedWarehouse = getSelectedWarehouse();
    if (!selectedWarehouse) {
      window.CoreInventoryUi.setMessage("location-message", "Select or create a warehouse first.", true);
      return;
    }

    const locationId = locationForm.elements.id.value;
    const payload = {
      name: locationForm.elements.name.value,
      code: locationForm.elements.code.value,
      is_active: normalizeCheckbox(locationForm, "is_active"),
    };

    try {
      await window.CoreInventoryApi.request(
        locationId
          ? `/warehouses/locations/${locationId}`
          : `/warehouses/${selectedWarehouse.id}/locations`,
        {
          method: locationId ? "PUT" : "POST",
          body: payload,
        }
      );

      window.CoreInventoryUi.setMessage(
        "location-message",
        locationId ? "Location updated successfully." : "Location created successfully."
      );
      resetLocationForm();
      await loadWarehouses();
      warehouseSelect.value = selectedWarehouse.id;
      await loadLocationsTable();
    } catch (error) {
      window.CoreInventoryUi.setMessage("location-message", error.message, true);
    }
  });

  warehouseResetButton.addEventListener("click", () => {
    resetWarehouseForm();
    window.CoreInventoryUi.setMessage("warehouse-message", "");
  });

  locationResetButton.addEventListener("click", () => {
    resetLocationForm();
    window.CoreInventoryUi.setMessage("location-message", "");
  });

  await loadWarehouses();
})();