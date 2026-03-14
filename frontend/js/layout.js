// Shared layout renderer for the CoreInventory SaaS shell, badges, and UI helpers.
(async function initLayout() {
  const page = document.body.dataset.page;
  const session = window.CoreInventoryApi.getSession();

  if (!page) {
    return;
  }

  if (!session?.token || !session?.user) {
    window.location.href = "./index.html";
    return;
  }

  try {
    const profileResponse = await window.CoreInventoryApi.request("/auth/profile");
    window.CoreInventoryApi.setSession({
      ...session,
      user: profileResponse.user,
    });
  } catch (_error) {
    window.CoreInventoryApi.clearSession();
    window.location.href = "./index.html";
    return;
  }

  const currentSession = window.CoreInventoryApi.getSession();
  const appShell = document.querySelector(".app-shell");
  const sidebar = document.getElementById("sidebar");
  const navbar = document.getElementById("navbar");

  const navItems = [
    { id: "dashboard", label: "Dashboard", href: "./dashboard.html", icon: "dashboard", subtitle: "KPIs and live warehouse visibility" },
    { id: "products", label: "Products", href: "./products.html", icon: "products", subtitle: "Catalog, SKUs, and product categories" },
    { id: "operations", label: "Operations", href: "./operations.html", icon: "operations", subtitle: "Document activity across the warehouse" },
    { id: "receipts", label: "Receipts", href: "./receipts.html", icon: "receipts", subtitle: "Incoming goods from suppliers" },
    { id: "deliveries", label: "Delivery Orders", href: "./deliveries.html", icon: "deliveries", subtitle: "Outbound shipments and dispatches" },
    { id: "transfers", label: "Transfers", href: "./transfers.html", icon: "transfers", subtitle: "Internal stock movement between locations" },
    { id: "adjustments", label: "Adjustments", href: "./adjustments.html", icon: "adjustments", subtitle: "Cycle counts and reconciliation" },
    { id: "stock", label: "Stock", href: "./stock.html", icon: "stock", subtitle: "Real-time stock by warehouse location" },
    { id: "history", label: "Move History", href: "./history.html", icon: "history", subtitle: "Ledger and traceability timeline" },
    { id: "warehouses", label: "Warehouses", href: "./warehouses.html", icon: "warehouse", subtitle: "Warehouse and location master data", roles: ["admin"] },
    { id: "settings", label: "Settings", href: "./settings.html", icon: "settings", subtitle: "Users, categories, and admin controls", roles: ["admin"] },
    { id: "profile", label: "My Profile", href: "./profile.html", icon: "profile", subtitle: "Your account details and password management", hiddenInNav: true },
  ];

  const currentPage = navItems.find((item) => item.id === page);

  if (currentPage?.roles && !currentPage.roles.includes(currentSession.user.role)) {
    window.location.href = "./dashboard.html";
    return;
  }

  if (sidebar) {
    sidebar.innerHTML = `
      <div>
        <div class="sidebar-brand">
          <span class="brand-mark">${getIcon("brand")}</span>
          <div class="brand-copy">
            <h2>CoreInventory</h2>
            <p>Inventory workspace</p>
          </div>
        </div>
        <p class="sidebar-section-label">Navigation</p>
        <nav class="sidebar-nav">
          ${navItems
            .filter((item) => !item.hiddenInNav && (!item.roles || item.roles.includes(currentSession.user.role)))
            .map(
              (item) => `
                <a class="sidebar-link ${item.id === page ? "active" : ""}" href="${item.href}">
                  <span class="nav-icon">${getIcon(item.icon)}</span>
                  <span>${item.label}</span>
                </a>
              `
            )
            .join("")}
        </nav>
      </div>
      <div class="sidebar-footer">
        <p>Logged in as</p>
        <strong>${currentSession.user.name}</strong>
        <p>${currentSession.user.email}</p>
      </div>
    `;
  }

  if (navbar) {
    navbar.innerHTML = `
      <div class="topbar-main">
        <button type="button" id="mobile-nav-toggle" class="icon-button mobile-nav-toggle" aria-label="Toggle navigation">
          ${getIcon("menu")}
        </button>
        <div class="topbar-title">
          <h3>${currentPage?.label || "CoreInventory"}</h3>
          <p>${currentPage?.subtitle || "Inventory visibility and warehouse operations."}</p>
        </div>
        <form class="topbar-search" id="global-search-form">
          <label class="search-field" for="global-search-input">
            ${getIcon("search")}
            <span class="sr-only">Global search</span>
            <input id="global-search-input" type="text" placeholder="Search products, SKUs, or documents" />
          </label>
        </form>
      </div>
      <div class="topbar-actions">
        <span class="role-pill">${currentSession.user.role.replaceAll("_", " ")}</span>
        <button type="button" class="icon-button" aria-label="Notifications">
          ${getIcon("bell")}
          <span class="notification-badge"></span>
        </button>
        <div class="profile-dropdown">
          <button type="button" id="profile-button" class="profile-button" aria-expanded="false">
            <span class="profile-avatar">${getIcon("user")}</span>
            <span class="profile-meta">
              <strong>${currentSession.user.name}</strong>
              <span>${currentSession.user.email}</span>
            </span>
            ${getIcon("chevron")}
          </button>
          <div id="profile-menu" class="dropdown-menu hidden">
            <a class="dropdown-link" href="./profile.html">
              ${getIcon("profile")}
              <span>My Profile</span>
            </a>
            <button type="button" id="logout-button" class="dropdown-action">
              ${getIcon("logout")}
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const logoutButton = document.getElementById("logout-button");
    const profileButton = document.getElementById("profile-button");
    const profileMenu = document.getElementById("profile-menu");
    const mobileToggle = document.getElementById("mobile-nav-toggle");
    const searchForm = document.getElementById("global-search-form");
    const searchInput = document.getElementById("global-search-input");

    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        window.CoreInventoryApi.clearSession();
        window.location.href = "./index.html";
      });
    }

    if (profileButton && profileMenu) {
      profileButton.addEventListener("click", () => {
        const isOpen = !profileMenu.classList.contains("hidden");
        profileMenu.classList.toggle("hidden", isOpen);
        profileButton.setAttribute("aria-expanded", String(!isOpen));
      });

      document.addEventListener("click", (event) => {
        if (!profileMenu.contains(event.target) && !profileButton.contains(event.target)) {
          profileMenu.classList.add("hidden");
          profileButton.setAttribute("aria-expanded", "false");
        }
      });
    }

    if (mobileToggle && appShell) {
      mobileToggle.addEventListener("click", () => {
        appShell.classList.toggle("nav-open");
      });
    }

    if (searchForm && searchInput) {
      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const query = String(searchInput.value || "").trim();

        if (!query) {
          return;
        }

        if (page === "products") {
          const productSearch = document.querySelector('#product-filter-form [name="search"]');
          if (productSearch) {
            productSearch.value = query;
            document.getElementById("product-filter-form")?.requestSubmit();
            return;
          }
        }

        window.location.href = `./products.html?search=${encodeURIComponent(query)}`;
      });
    }
  }
})();

function renderBadge(value) {
  const normalized = String(value || "").toLowerCase();
  let badgeClass = "badge-primary";

  if (["done", "validated", "active", "healthy", "posted"].includes(normalized)) {
    badgeClass = "badge-success";
  } else if (["draft", "inactive"].includes(normalized)) {
    badgeClass = "badge-neutral";
  } else if (["waiting", "pending", "picked", "low"].includes(normalized)) {
    badgeClass = "badge-warning";
  } else if (["ready", "packed"].includes(normalized)) {
    badgeClass = "badge-info";
  } else if (["canceled", "cancelled", "error"].includes(normalized)) {
    badgeClass = "badge-danger";
  } else if (["receipt", "delivery", "transfer", "adjustment"].includes(normalized)) {
    badgeClass = "badge-primary";
  }

  return `<span class="badge ${badgeClass}">${String(value || "").replaceAll("_", " ")}</span>`;
}

function renderEmptyState(message) {
  return `<div class="empty-state">${message}</div>`;
}

function setMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  element.textContent = message || "";
  element.style.color = isError ? "var(--error)" : "var(--primary)";
}

function populateSelect(select, options, placeholder = "All") {
  if (!select) {
    return;
  }

  select.innerHTML = [
    placeholder !== null ? `<option value="">${placeholder}</option>` : "",
    ...options.map((option) => `<option value="${option.value}">${option.label}</option>`),
  ].join("");
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

function formatRelativeTime(value) {
  if (!value) {
    return "-";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function renderTableFooter(count, label = "records") {
  if (!count) {
    return "";
  }

  return `
    <div class="table-footer">
      <span>Showing 1-${count} of ${count} ${label}</span>
      <span class="table-pagination">
        <span class="page-pill">1</span>
        <span>Page 1</span>
      </span>
    </div>
  `;
}

function getIcon(name) {
  const icons = {
    brand: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3.5" y="4" width="10" height="16" rx="2.5"></rect>
        <path d="M13.5 8h5a2 2 0 0 1 2 2v7.5A2.5 2.5 0 0 1 18 20h-4.5"></path>
        <path d="M7 8h3"></path>
      </svg>
    `,
    dashboard: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="2"></rect>
        <rect x="13" y="3" width="8" height="5" rx="2"></rect>
        <rect x="13" y="10" width="8" height="11" rx="2"></rect>
        <rect x="3" y="13" width="8" height="8" rx="2"></rect>
      </svg>
    `,
    products: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3 4 7l8 4 8-4-8-4Z"></path>
        <path d="M4 7v10l8 4 8-4V7"></path>
        <path d="M12 11v10"></path>
      </svg>
    `,
    operations: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M5 12h14"></path>
        <path d="m12 5 7 7-7 7"></path>
      </svg>
    `,
    receipts: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7 3h10l2 3v14l-2-1-2 1-2-1-2 1-2-1-2 1V6l2-3Z"></path>
        <path d="M9 9h6"></path>
        <path d="M9 13h6"></path>
      </svg>
    `,
    deliveries: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 7h11v8H3z"></path>
        <path d="M14 10h3l4 3v2h-7"></path>
        <circle cx="7.5" cy="18.5" r="1.5"></circle>
        <circle cx="17.5" cy="18.5" r="1.5"></circle>
      </svg>
    `,
    transfers: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7 7h11"></path>
        <path d="m14 4 4 3-4 3"></path>
        <path d="M17 17H6"></path>
        <path d="m10 14-4 3 4 3"></path>
      </svg>
    `,
    adjustments: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3v18"></path>
        <path d="M7 8h10"></path>
        <path d="M7 16h10"></path>
      </svg>
    `,
    stock: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 18h16"></path>
        <path d="M6 18V8"></path>
        <path d="M12 18V4"></path>
        <path d="M18 18v-6"></path>
      </svg>
    `,
    history: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8"></circle>
        <path d="M12 8v5l3 2"></path>
      </svg>
    `,
    warehouse: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 21V8l9-5 9 5v13"></path>
        <path d="M9 21v-6h6v6"></path>
      </svg>
    `,
    settings: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.8a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.8a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.1.4 1.7 1.7 0 0 0-.6 1Z"></path>
      </svg>
    `,
    search: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="m20 20-3.5-3.5"></path>
      </svg>
    `,
    bell: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M15 17H5.5a1 1 0 0 1-.7-1.7l1.2-1.2V10a6 6 0 1 1 12 0v4.1l1.2 1.2a1 1 0 0 1-.7 1.7H18"></path>
        <path d="M10 20a2 2 0 0 0 4 0"></path>
      </svg>
    `,
    user: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4"></circle>
        <path d="M5 20a7 7 0 0 1 14 0"></path>
      </svg>
    `,
    chevron: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    `,
    logout: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <path d="m16 17 5-5-5-5"></path>
        <path d="M21 12H9"></path>
      </svg>
    `,
    profile: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 21a8 8 0 0 0-16 0"></path>
        <circle cx="12" cy="8" r="4"></circle>
      </svg>
    `,
    menu: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 7h16"></path>
        <path d="M4 12h16"></path>
        <path d="M4 17h16"></path>
      </svg>
    `,
  };

  return icons[name] || icons.dashboard;
}

window.CoreInventoryUi = {
  renderBadge,
  renderEmptyState,
  renderTableFooter,
  setMessage,
  populateSelect,
  formatDate,
  formatRelativeTime,
  getIcon,
  get session() {
    return window.CoreInventoryApi.getSession();
  },
};