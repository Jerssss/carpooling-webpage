/**
 * API Configuration and Common Utilities
 */

const API_BASE_URL = "http://localhost:4000/api/admin";

/**
 * Make authenticated API requests
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...defaultOptions,
        ...options
    });

    return response;
}

/**
 * Make GET request
 */
async function apiGet(endpoint) {
    const res = await apiRequest(endpoint);
    if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
    return await res.json();
}

/**
 * Make PATCH request
 */
async function apiPatch(endpoint, data) {
    const res = await apiRequest(endpoint, {
        method: "PATCH",
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to update ${endpoint}`);
    return await res.json();
}

/**
 * Make POST request
 */
async function apiPost(endpoint, data) {
    const res = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to post to ${endpoint}`);
    return await res.json();
}

export { API_BASE_URL, apiRequest, apiGet, apiPatch, apiPost };
