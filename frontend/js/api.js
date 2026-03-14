// Shared browser API helper for authenticated requests and session storage.
const API_BASE_URL = "/api";
const SESSION_KEY = "coreinventory_session";

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch (_error) {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function toQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  return query.toString();
}

async function request(endpoint, options = {}) {
  const session = getSession();
  const headers = { ...(options.headers || {}) };
  let body = options.body;

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  if (options.auth !== false && session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers,
    body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") {
      clearSession();
      window.location.href = "./index.html";
    }

    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

window.CoreInventoryApi = {
  request,
  getSession,
  setSession,
  clearSession,
  formToObject,
  toQueryString,
};