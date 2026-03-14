// Profile page logic for showing the current user and updating their password.
(async function initProfilePage() {
  if (document.body.dataset.page !== "profile") {
    return;
  }

  const summary = document.getElementById("profile-summary");
  const passwordForm = document.getElementById("profile-password-form");

  function renderSummary(user) {
    summary.innerHTML = `
      <div class="table-wrap">
        <table>
          <tbody>
            <tr><th>Name</th><td>${user.name}</td></tr>
            <tr><th>Email</th><td>${user.email}</td></tr>
            <tr><th>Role</th><td>${window.CoreInventoryUi.renderBadge(user.role)}</td></tr>
            <tr><th>Status</th><td>${window.CoreInventoryUi.renderBadge(user.is_active ? "done" : "draft")}</td></tr>
            <tr><th>Created</th><td>${window.CoreInventoryUi.formatDate(user.created_at)}</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  const response = await window.CoreInventoryApi.request("/auth/profile");
  renderSummary(response.user);

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = window.CoreInventoryApi.formToObject(passwordForm);
      await window.CoreInventoryApi.request("/auth/reset-password", {
        method: "POST",
        body: payload,
      });
      passwordForm.reset();
      window.CoreInventoryUi.setMessage("profile-message", "Password updated successfully.");
    } catch (error) {
      window.CoreInventoryUi.setMessage("profile-message", error.message, true);
    }
  });
})();
