// Lightweight API helper placeholder for future frontend-to-backend requests.
const API_BASE_URL = "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  return response.json();
}

window.CoreInventoryApi = {
  request,
};
