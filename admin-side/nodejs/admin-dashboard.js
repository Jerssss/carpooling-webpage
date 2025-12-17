/**
 * Admin Dashboard - Main Entry Point
 * Manages panel switching and initializes all modules
 */

import { checkAdminSession, handleLogout } from './auth.js';
import { loadUsers, setupUserSearchListener } from './users.js';
import { loadVehicles } from './vehicles.js';
import { loadReports } from './reports.js';
import { loadRides } from './rides.js';
import { setupModalBackdropClosers } from './ui-helpers.js';

// Import modules to expose globally for onclick handlers
import * as userModule from './users.js';
import * as vehicleModule from './vehicles.js';
import * as reportsModule from './reports.js';
import * as ridesModule from './rides.js';
import * as uiHelpers from './ui-helpers.js';

// Expose modules globally for inline onclick handlers
window.userModule = userModule;
window.vehicleModule = vehicleModule;
window.reportsModule = reportsModule;
window.ridesModule = ridesModule;
window.uiHelpers = uiHelpers;

// Expose specific functions for inline onclick handlers
window.updateVehicle = vehicleModule.updateVehicle; 

console.log("admin-dashboard.js loaded");

/**
 * Initialize dashboard on DOM load
 */
document.addEventListener("DOMContentLoaded", async () => {
    // Check session validity
    await checkAdminSession();

    // Setup tab switching
    setupTabSwitching();

    // Setup logout handler
    setupLogoutHandler();

    // Setup modal backdrop closers
    setupModalBackdropClosers();

    // Setup search listeners
    setupUserSearchListener();

    // Load default tab (User Accounts)
    loadUsers("all");
});

/**
 * Setup panel and tab switching
 */
function setupTabSwitching() {
    const sectionCards = document.querySelectorAll(".section-card");
    const windows = document.querySelectorAll(".content-window");

    sectionCards.forEach(card => {
        card.addEventListener("click", () => {
            // Remove active class from all
            sectionCards.forEach(c => c.classList.remove("active"));
            windows.forEach(w => w.classList.remove("active"));

            // Add active to clicked card and corresponding window
            card.classList.add("active");
            const target = card.dataset.target;
            document.getElementById(target).classList.add("active");

            // Load corresponding data
            if (target === "user-accounts") loadUsers();
            if (target === "vehicle-registrations") loadVehicles();
            if (target === "reports-complaints") loadReports();
            if (target === "active-rides") loadRides();
        });
    });

    // Filter tabs for users
    const filterTabs = document.querySelectorAll(".filter-tab");
    filterTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            // Update active tab UI
            filterTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            // Get filter type and reload
            const filter = tab.dataset.filter;
            loadUsers(filter);
        });
    });
}

/**
 * Setup logout button handler
 */
function setupLogoutHandler() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
        console.warn("Logout button not found");
        return;
    }

    logoutBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to logout?")) return;
        await handleLogout();
    });
}
