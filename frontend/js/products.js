// Products page logic for catalog creation, filtering, and lightweight admin actions.
(async function initProductsPage() {
  if (document.body.dataset.page !== "products") {
    return;
  }

  const session = window.CoreInventoryUi.session;
  const filterForm = document.getElementById("product-filter-form");
  const productForm = document.getElementById("product-form");
  const productFormPanel = document.getElementById("product-form-panel");
  const canManageProducts = ["admin", "inventory_manager"].includes(session.user.role);
  const searchParams = new URLSearchParams(window.location.search);

  if (!canManageProducts) {
    productFormPanel.classList.add("hidden");
  }

  if (searchParams.get("search")) {
    filterForm.elements.search.value = searchParams.get("search");
  }

  async function loadCategories() {
    const response = await window.CoreInventoryApi.request("/products/categories");
    const options = response.categories.map((category) => ({ value: category.id, label: category.name }));
    window.CoreInventoryUi.populateSelect(filterForm.elements.category_id, options, "All Categories");
    window.CoreInventoryUi.populateSelect(productForm.elements.category_id, options, "No Category");

    if (searchParams.get("category_id")) {
      filterForm.elements.category_id.value = searchParams.get("category_id");
    }

    return response.categories;
  }

  function renderProductsTable(products) {
    if (!products.length) {
      return window.CoreInventoryUi.renderEmptyState("No products match the selected filters.");
    }

    return `
      <div class="table-wrap">
        <div class="table-meta">
          <span>Catalog overview with stock thresholds and availability</span>
          <span>${products.length} products</span>
        </div>
        <table>
          <thead>
            <tr><th>Product</th><th>Category</th><th>Unit</th><th>Total Stock</th><th>Reorder</th><th>Status</th>${canManageProducts ? "<th>Actions</th>" : ""}</tr>
          </thead>
          <tbody>
            ${products
              .map(
                (product) => `
                  <tr>
                    <td>
                      <span class="table-title">${product.name}</span>
                      <span class="table-subtitle">${product.sku}</span>
                    </td>
                    <td>${product.category_name || "-"}</td>
                    <td>${product.unit_of_measure}</td>
                    <td>${Number(product.total_stock)}</td>
                    <td>${product.reorder_level}</td>
                    <td>${window.CoreInventoryUi.renderBadge(product.is_active ? "done" : "draft")}</td>
                    ${
                      canManageProducts
                        ? `<td><button class="text-button" data-delete-product="${product.id}">Delete</button></td>`
                        : ""
                    }
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
        ${window.CoreInventoryUi.renderTableFooter(products.length, "products")}
      </div>
    `;
  }

  async function loadProducts() {
    const values = window.CoreInventoryApi.formToObject(filterForm);
    const query = window.CoreInventoryApi.toQueryString(values);
    const response = await window.CoreInventoryApi.request(`/products${query ? `?${query}` : ""}`);

    document.getElementById("products-table").innerHTML = renderProductsTable(response.products);

    const nextUrl = query ? `./products.html?${query}` : "./products.html";
    window.history.replaceState({}, "", nextUrl);

    if (canManageProducts) {
      document.querySelectorAll("[data-delete-product]").forEach((button) => {
        button.addEventListener("click", async () => {
          if (!window.confirm("Delete this product?")) {
            return;
          }

          try {
            await window.CoreInventoryApi.request(`/products/${button.dataset.deleteProduct}`, {
              method: "DELETE",
            });
            await loadProducts();
          } catch (error) {
            window.CoreInventoryUi.setMessage("product-message", error.message, true);
          }
        });
      });
    }
  }

  filterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadProducts();
  });

  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await window.CoreInventoryApi.request("/products", {
        method: "POST",
        body: window.CoreInventoryApi.formToObject(productForm),
      });
      productForm.reset();
      window.CoreInventoryUi.setMessage("product-message", "Product saved successfully.");
      await loadProducts();
    } catch (error) {
      window.CoreInventoryUi.setMessage("product-message", error.message, true);
    }
  });

  await loadCategories();
  await loadProducts();
})();
