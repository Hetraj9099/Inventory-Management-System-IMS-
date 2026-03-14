// Admin settings page logic for users and product category maintenance.
(async function initSettingsPage() {
  if (document.body.dataset.page !== "settings") {
    return;
  }

  const session = window.CoreInventoryUi.session;
  if (session.user.role !== "admin") {
    window.location.href = "./dashboard.html";
    return;
  }

  const userForm = document.getElementById("user-form");
  const categoryForm = document.getElementById("category-form");

  async function loadUsers() {
    const response = await window.CoreInventoryApi.request("/auth/users");
    document.getElementById("users-table").innerHTML = response.users.length
      ? `
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${response.users
              .map(
                (user) => `
                  <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>
                      <select data-user-role="${user.id}">
                        <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
                        <option value="inventory_manager" ${user.role === "inventory_manager" ? "selected" : ""}>Inventory Manager</option>
                        <option value="warehouse_staff" ${user.role === "warehouse_staff" ? "selected" : ""}>Warehouse Staff</option>
                      </select>
                    </td>
                    <td>${window.CoreInventoryUi.renderBadge(user.is_active ? "active" : "inactive")}</td>
                    <td>
                      <button class="text-button" data-save-user="${user.id}">Save Role</button>
                      <button class="text-button" data-toggle-user="${user.id}" data-active="${user.is_active}">
                        ${user.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button class="text-button" data-delete-user="${user.id}" data-user-name="${user.name}">
                        Delete
                      </button>
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
      : window.CoreInventoryUi.renderEmptyState("No users created yet.");

    document.querySelectorAll("[data-save-user]").forEach((button) => {
      button.addEventListener("click", async () => {
        const userId = button.dataset.saveUser;
        const role = document.querySelector(`[data-user-role="${userId}"]`).value;
        try {
          await window.CoreInventoryApi.request(`/auth/users/${userId}`, {
            method: "PATCH",
            body: { role },
          });
          await loadUsers();
        } catch (error) {
          window.CoreInventoryUi.setMessage("settings-message", error.message, true);
        }
      });
    });

    document.querySelectorAll("[data-toggle-user]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await window.CoreInventoryApi.request(`/auth/users/${button.dataset.toggleUser}`, {
            method: "PATCH",
            body: { is_active: button.dataset.active !== "true" },
          });
          await loadUsers();
        } catch (error) {
          window.CoreInventoryUi.setMessage("settings-message", error.message, true);
        }
      });
    });

    document.querySelectorAll("[data-delete-user]").forEach((button) => {
      button.addEventListener("click", async () => {
        const confirmed = window.confirm(`Delete user "${button.dataset.userName}"? This action cannot be undone.`);
        if (!confirmed) {
          return;
        }

        try {
          await window.CoreInventoryApi.request(`/auth/users/${button.dataset.deleteUser}`, {
            method: "DELETE",
          });
          window.CoreInventoryUi.setMessage("settings-message", "User deleted successfully.");
          await loadUsers();
        } catch (error) {
          window.CoreInventoryUi.setMessage("settings-message", error.message, true);
        }
      });
    });
  }

  async function loadCategories() {
    const response = await window.CoreInventoryApi.request("/products/categories");
    document.getElementById("categories-table").innerHTML = response.categories.length
      ? `
        <table>
          <thead>
            <tr><th>Name</th><th>Description</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${response.categories
              .map(
                (category) => `
                  <tr>
                    <td>${category.name}</td>
                    <td>${category.description || "-"}</td>
                    <td><button class="text-button" data-delete-category="${category.id}">Delete</button></td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
      : window.CoreInventoryUi.renderEmptyState("No categories created yet.");

    document.querySelectorAll("[data-delete-category]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await window.CoreInventoryApi.request(`/products/categories/${button.dataset.deleteCategory}`, {
            method: "DELETE",
          });
          await loadCategories();
        } catch (error) {
          window.CoreInventoryUi.setMessage("settings-message", error.message, true);
        }
      });
    });
  }

  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await window.CoreInventoryApi.request("/auth/users", {
        method: "POST",
        body: window.CoreInventoryApi.formToObject(userForm),
      });
      userForm.reset();
      window.CoreInventoryUi.setMessage("settings-message", "User created successfully.");
      await loadUsers();
    } catch (error) {
      window.CoreInventoryUi.setMessage("settings-message", error.message, true);
    }
  });

  categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await window.CoreInventoryApi.request("/products/categories", {
        method: "POST",
        body: window.CoreInventoryApi.formToObject(categoryForm),
      });
      categoryForm.reset();
      window.CoreInventoryUi.setMessage("settings-message", "Category created successfully.");
      await loadCategories();
    } catch (error) {
      window.CoreInventoryUi.setMessage("settings-message", error.message, true);
    }
  });

  await Promise.all([loadUsers(), loadCategories()]);
})();