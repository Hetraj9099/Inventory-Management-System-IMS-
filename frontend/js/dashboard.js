  // Dashboard page logic for KPI filters, low-stock alerts, recent operations, and activity timeline.
  (async function initDashboardPage() {
    if (document.body.dataset.page !== "dashboard") {
      return;
    }

    const filtersForm = document.getElementById("dashboard-filters");
    const [warehousesResponse, categoriesResponse] = await Promise.all([
      window.CoreInventoryApi.request("/warehouses"),
      window.CoreInventoryApi.request("/products/categories"),
    ]);

    window.CoreInventoryUi.populateSelect(
      filtersForm.elements.warehouse,
      warehousesResponse.warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
      "All Warehouses"
    );

    window.CoreInventoryUi.populateSelect(
      filtersForm.elements.category,
      categoriesResponse.categories.map((category) => ({ value: category.id, label: category.name })),
      "All Categories"
    );

    function renderKpiCards(kpis) {
      const cards = [
        {
          label: "Total Products",
          value: kpis.total_products_in_stock,
          icon: "products",
          tone: "accent",
          note: `${kpis.total_units_in_stock} total units across active locations`,
        },
        {
          label: "Low Stock Items",
          value: kpis.low_stock_items,
          icon: "stock",
          tone: "warning",
          note: "Products at or below reorder threshold",
        },
        {
          label: "Pending Receipts",
          value: kpis.pending_receipts,
          icon: "receipts",
          tone: "info",
          note: "Draft inbound documents awaiting validation",
        },
        {
          label: "Pending Deliveries",
          value: kpis.pending_deliveries,
          icon: "deliveries",
          tone: "primary",
          note: "Outbound orders still in progress",
        },
        {
          label: "Internal Transfers",
          value: kpis.scheduled_transfers,
          icon: "transfers",
          tone: "success",
          note: "Draft internal moves between locations",
        },
      ];

      return cards
        .map(
          (card) => `
            <article class="kpi-card ${card.tone}">
              <div class="kpi-top">
                <span class="kpi-icon">${window.CoreInventoryUi.getIcon(card.icon)}</span>
                ${window.CoreInventoryUi.renderBadge(card.label === "Low Stock Items" ? "waiting" : "done")}
              </div>
              <span class="kpi-label">${card.label}</span>
              <strong class="kpi-value">${card.value}</strong>
              <span class="kpi-note">${card.note}</span>
            </article>
          `
        )
        .join("");
    }

    function renderLowStockTable(items) {
      if (!items.length) {
        return window.CoreInventoryUi.renderEmptyState("No low stock alerts for the selected filters.");
      }

      return `
        <div class="table-wrap">
          <div class="table-meta">
            <span>Critical items requiring replenishment attention</span>
            <span>${items.length} flagged</span>
          </div>
          <table>
            <thead>
              <tr><th>Product</th><th>Warehouse</th><th>Quantity</th><th>Reorder</th></tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                    <tr>
                      <td>
                        <span class="table-title">${item.name}</span>
                        <span class="table-subtitle">${item.sku} · ${item.location_name}</span>
                      </td>
                      <td>${item.warehouse_name}</td>
                      <td>${item.quantity}</td>
                      <td>${item.reorder_level}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
          ${window.CoreInventoryUi.renderTableFooter(items.length, "alerts")}
        </div>
      `;
    }

    function renderRecentOperations(items) {
      if (!items.length) {
        return window.CoreInventoryUi.renderEmptyState("No recent stock activity yet.");
      }

      return `
        <div class="table-wrap">
          <div class="table-meta">
            <span>Live operational history from the stock ledger</span>
            <span>${items.length} recent entries</span>
          </div>
          <table>
            <thead>
              <tr><th>Reference</th><th>Product</th><th>Warehouse</th><th>Quantity</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              ${items
                .map((item) => {
                  const quantityClass = Number(item.quantity_change) >= 0 ? "qty-positive" : "qty-negative";
                  const reference = `${item.reference_type} #${item.reference_id}`;
                  return `
                    <tr>
                      <td>
                        <span class="table-title">${reference}</span>
                        <span class="table-subtitle">${window.CoreInventoryUi.formatRelativeTime(item.created_at)}</span>
                      </td>
                      <td>
                        <span class="table-title">${item.product_name}</span>
                        <span class="table-subtitle">${item.sku}</span>
                      </td>
                      <td>${item.warehouse_name}<br /><small>${item.location_name}</small></td>
                      <td class="${quantityClass}">${Number(item.quantity_change) > 0 ? "+" : ""}${item.quantity_change}</td>
                      <td>${window.CoreInventoryUi.renderBadge(item.action_type)}</td>
                      <td>${window.CoreInventoryUi.formatDate(item.created_at)}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
          ${window.CoreInventoryUi.renderTableFooter(items.length, "operations")}
        </div>
      `;
    }

    function renderTimeline(items) {
      if (!items.length) {
        return window.CoreInventoryUi.renderEmptyState("No recent stock movement to show in the timeline.");
      }

      return `
        <div class="timeline">
          ${items
            .map(
              (item) => `
                <article class="timeline-item">
                  <div class="timeline-marker"></div>
                  <div class="timeline-content">
                    <strong>${item.action_type} · ${item.product_name}</strong>
                    <p>${item.warehouse_name} / ${item.location_name} · Ref ${item.reference_type} #${item.reference_id}</p>
                    <span class="timeline-time">
                      ${Number(item.quantity_change) > 0 ? "+" : ""}${item.quantity_change} units · ${window.CoreInventoryUi.formatRelativeTime(item.created_at)}
                    </span>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      `;
    }

    async function loadDashboard() {
      const query = window.CoreInventoryApi.toQueryString(window.CoreInventoryApi.formToObject(filtersForm));
      const response = await window.CoreInventoryApi.request(`/dashboard${query ? `?${query}` : ""}`);

      document.getElementById("kpi-grid").innerHTML = renderKpiCards(response.kpis);
      document.getElementById("low-stock-list").innerHTML = renderLowStockTable(response.low_stock_alerts);
      document.getElementById("recent-activity-list").innerHTML = renderRecentOperations(response.recent_activity);
      document.getElementById("activity-timeline").innerHTML = renderTimeline(response.recent_activity.slice(0, 6));
    }

    filtersForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await loadDashboard();
    });

    await loadDashboard();
  })();
