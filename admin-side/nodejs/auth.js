/**
 * Authentication and Session Management
 */

import { apiRequest } from './api.js';

/**
 * Check if user has valid admin session
 */
async function checkAdminSession() {
    try {
        const res = await apiRequest("/dashboard");
        if (!res.ok) {
            alert("Session expired. Please login again.");
            window.location.href = "/9467_it312-teamarc_midtermproject/login.html";
            return false;
        }
        return true;
    } catch (err) {
        console.error("Session check error:", err);
        window.location.href = "/9467_it312-teamarc_midtermproject/login.html";
        return false;
    }
}

/**
 * Handle admin logout
 */
async function handleLogout() {
    try {
        const res = await apiRequest("/logout", { method: "POST" });
        if (res.ok) {
            window.location.href = "/9467_it312-teamarc_midtermproject/login.html";
        } else {
            alert("Logout failed. Please try again.");
        }
    } catch (err) {
        console.error("Logout error:", err);
        alert("Server error during logout.");
    }
}

export { checkAdminSession, handleLogout };
