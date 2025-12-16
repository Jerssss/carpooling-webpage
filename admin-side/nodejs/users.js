/**
 * User Management Module
 */

import { apiGet, apiPatch } from './api.js';
import { openUserModal, closeUserModal } from './ui-helpers.js';

let currentFilter = "all";
let currentSearch = "";

/**
 * Load and display users with filtering
 */
async function loadUsers(filter = "all", search = "") {
    try {
        currentFilter = filter;
        currentSearch = search;

        const users = await apiGet("/users");

        let filtered = users;

        if (filter === "verified") {
            filtered = users.filter(u => u.isVerified === true);
        } else if (filter === "unverified") {
            filtered = users.filter(u => u.isVerified === false);
        }

        if (search.trim() !== "") {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(u =>
                u.name.toLowerCase().includes(searchLower) ||
                u.userID.toLowerCase().includes(searchLower) ||
                u.roles.join(", ").toLowerCase().includes(searchLower)
            );
        }

        displayUsers(filtered);
    } catch (err) {
        console.error("Error loading users:", err);
        document.getElementById("userList").innerHTML = `
            <div class="empty-state">
                <p>Error loading users. Please try again.</p>
            </div>
        `;
    }
}

/**
 * Display users in list
 */
function displayUsers(users) {
    const list = document.getElementById("userList");

    if (users.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>No users found</p>
            </div>
        `;
        return;
    }

    list.innerHTML = users.map(u => `
        <div class="user-row">
            <div class="user-info">
                <div class="name">${u.name}</div>
                <div class="role">${u.roles ? u.roles.join(", ") : "N/A"}</div>
            </div>
            <div class="user-id">${u.userID}</div>
            <div class="user-status">
                <span class="status-badge ${u.isVerified ? 'verified' : 'unverified'}">
                    ${u.isVerified ? 'Verified' : 'Unverified'}
                </span>
            </div>
            <div class="user-action">
                <button class="view-details-btn" onclick="window.userModule.viewUserDetails('${u.userID}')">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * View detailed user information
 */
async function viewUserDetails(userID) {
    try {
        const u = await apiGet(`/users/${userID}`);

        document.getElementById("modalUserName").textContent = u.name;
        document.getElementById("modalUserID").textContent = u.userID;
        document.getElementById("modalName").textContent = u.name;
        document.getElementById("modalEmail").textContent = u.email;
        document.getElementById("modalPhone").textContent = u.phoneNo;
        document.getElementById("modalOccupation").textContent = u.occupation || "N/A";
        document.getElementById("modalRoles").textContent = u.roles ? u.roles.join(", ") : "N/A";

        const statusElement = document.getElementById("modalStatus");
        statusElement.textContent = u.isVerified ? "Verified" : "Unverified";
        statusElement.className = u.isVerified ? "detail-value verified" : "detail-value unverified";

        displayUserDocuments(u);

        const verifyBtn = document.getElementById("verifyBtn");
        const revokeBtn = document.getElementById("revokeBtn");

        verifyBtn.onclick = () => updateUserVerification(u.userID, true);
        revokeBtn.onclick = () => updateUserVerification(u.userID, false);

        if (u.isVerified) {
            verifyBtn.style.display = "none";
            revokeBtn.style.display = "block";
        } else {
            verifyBtn.style.display = "block";
            revokeBtn.style.display = "none";
        }

        openUserModal();

    } catch (err) {
        console.error("Error viewing user details:", err);
        alert("Failed to load user details. Please try again.");
    }
}

/**
 * Display user documents based on role
 */
function displayUserDocuments(u) {
    const documentsGrid = document.getElementById("documentsGrid");
    const documentsSection = document.getElementById("documentsSection");

    documentsGrid.innerHTML = "";

    const isDriver = u.roles && u.roles.includes("driver");

    if (isDriver && u.driverDocs) {
        documentsGrid.className = "documents-grid";

        documentsGrid.innerHTML += `
            <div class="document-box">
                <img src="../${u.picture || 'images/profile_pics/default-pic.png'}"
                     alt="Profile Picture"
                     onerror="this.src='../images/profile_pics/default-pic.png'">
                <div class="document-label">Profile Picture</div>
            </div>
        `;

        documentsGrid.innerHTML += `
            <div class="document-box">
                <img src="../${u.driverDocs.licenseImage || 'images/fallback_pics/default-license.png'}"
                     alt="Driver's License"
                     onerror="this.src='../images/fallback_pics/default-license.png'">
                <div class="document-label">Driver's License</div>
            </div>
        `;

        documentsGrid.innerHTML += `
            <div class="document-box">
                <img src="../${u.driverDocs.vehicleRegImage || 'images/fallback_pics/default-car.png'}"
                     alt="Vehicle Registration"
                     onerror="this.src='../images/fallback_pics/default-car.png'">
                <div class="document-label">Vehicle Registration</div>
            </div>
        `;

        documentsSection.style.display = "block";
    } else {
        documentsGrid.className = "documents-grid two-column";

        documentsGrid.innerHTML = `
            <div class="document-box" style="grid-column: 1 / -1;">
                <img src="../${u.picture || 'images/default-profile.png'}"
                     alt="Profile Picture"
                     onerror="this.src='../images/default-profile.png'">
                <div class="document-label">Profile Picture</div>
            </div>
        `;

        documentsSection.style.display = "block";
    }
}

/**
 * Update user verification status
 */
async function updateUserVerification(userID, status) {
    try {
        await apiPatch(`/users/${userID}/verify`, { isVerified: status });

        closeUserModal();
        loadUsers(currentFilter, currentSearch);

        console.log(`User ${userID} ${status ? 'verified' : 'unverified'} successfully`);

    } catch (err) {
        console.error("Error updating user verification:", err);
        alert("Failed to update user verification. Please try again.");
    }
}

/**
 * Setup user search listeners
 */
function setupUserSearchListener() {
    const searchInput = document.getElementById("userSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            currentSearch = searchInput.value.toLowerCase();
            loadUsers(currentFilter, currentSearch);
        });
    }
}

export { loadUsers, viewUserDetails, updateUserVerification, setupUserSearchListener };
