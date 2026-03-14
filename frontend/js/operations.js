// Shared operations helpers plus the warehouse activity overview page.
async function loadReferenceData() {
  const [productsResponse, warehousesResponse] = await Promise.all([
    window.CoreInventoryApi.request("/products"),
    window.CoreInventoryApi.request("/warehouses"),
  ]);

  return {
    products: productsResponse.products || [],
    warehouses: warehousesResponse.warehouses || [],
  };
}

function bindWarehouseLocations(warehouseSelect, locationSelect, warehouses) {
  function refreshLocationOptions() {
    const selectedWarehouse = warehouses.find(
      (warehouse) => String(warehouse.id) === String(warehouseSelect.value)
    );

    window.CoreInventoryUi.populateSelect(
      locationSelect,
      (selectedWarehouse?.locations || []).map((location) => ({
        value: location.id,
        label: `${location.name} (${location.code})`,
      })),
      null
    );
  }

  warehouseSelect.onchange = refreshLocationOptions;
  refreshLocationOptions();
}

function addItemRow(container, products) {
  const row = document.createElement("div");
  row.className = "line-item-row";
  row.innerHTML = `
    <label>
      <span>Product</span>
      <select name="product_id" required>
        ${products
          .map((product) => `<option value="${product.id}">${product.name} (${product.sku})</option>`)
          .join("")}
      </select>
    </label>
    <label>
      <span>Qty</span>
      <input type="number" name="quantity" min="1" step="1" value="1" required />
    </label>
    <button type="button" class="ghost-button" data-remove-item>x</button>
  `;

  row.querySelector("[data-remove-item]").addEventListener("click", () => {
    if (container.children.length > 1) {
      row.remove();
    }
  });

  container.appendChild(row);
}

function extractItems(container) {
  return Array.from(container.querySelectorAll(".line-item-row")).map((row) => ({
    product_id: Number(row.querySelector('[name="product_id"]').value),
    quantity: Number(row.querySelector('[name="quantity"]').value),
  }));
}

async function initOperationsOverview() {
  if (document.body.dataset.page !== "operations") {
    return;
  }

  const [receipts, deliveries, transfers, adjustments] = await Promise.all([
    window.CoreInventoryApi.request("/receipts"),
    window.CoreInventoryApi.request("/deliveries"),
    window.CoreInventoryApi.request("/transfers"),
    window.CoreInventoryApi.request("/adjustments"),
  ]);

  const cards = [
    { title: "Receipts", value: receipts.receipts.length, href: "./receipts.html", note: "Incoming goods from suppliers" },
    { title: "Delivery Orders", value: deliveries.deliveries.length, href: "./deliveries.html", note: "Outbound shipments to customers" },
    { title: "Transfers", value: transfers.transfers.length, href: "./transfers.html", note: "Internal stock movements" },
    { title: "Adjustments", value: adjustments.adjustments.length, href: "./adjustments.html", note: "Physical count corrections" },
  ];

  document.getElementById("operations-overview").innerHTML = cards
    .map(
      (card) => `
        <a class="panel quick-link-card" href="${card.href}">
          <span class="eyebrow">${card.title}</span>
          <strong>${card.value}</strong>
          <p>${card.note}</p>
        </a>
      `
    )
    .join("");

  const recentRows = [
    ...receipts.receipts.map((item) => ({
      type: "Receipt",
      number: item.receipt_number,
      status: item.status,
      created_at: item.created_at,
    })),
    ...deliveries.deliveries.map((item) => ({
      type: "Delivery",
      number: item.delivery_number,
      status: item.status,
      created_at: item.created_at,
    })),
    ...transfers.transfers.map((item) => ({
      type: "Transfer",
      number: item.transfer_number,
      status: item.status,
      created_at: item.created_at,
    })),
    ...adjustments.adjustments.map((item) => ({
      type: "Adjustment",
      number: item.adjustment_number,
      status: "posted",
      created_at: item.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  document.getElementById("operations-feed").innerHTML = recentRows.length
    ? `
      <table>
        <thead>
          <tr><th>Type</th><th>Document</th><th>Status</th><th>Created</th></tr>
        </thead>
        <tbody>
          ${recentRows
            .map(
              (row) => `
                <tr>
                  <td>${row.type}</td>
                  <td>${row.number}</td>
                  <td>${window.CoreInventoryUi.renderBadge(row.status)}</td>
                  <td>${window.CoreInventoryUi.formatDate(row.created_at)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `
    : window.CoreInventoryUi.renderEmptyState("No operations have been created yet.");
}

window.CoreInventoryOperations = {
  loadReferenceData,
  bindWarehouseLocations,
  addItemRow,
  extractItems,
};

initOperationsOverview();
