/**
 * Vehicle Registration Management Module
 */

import { apiGet, apiPatch } from './api.js';
import { openVehicleModal, closeVehicleModal } from './ui-helpers.js';

let currentVehicleFilter = "pending";
let currentVehicleSearch = "";
let allVehiclesData = [];
let currentVehicleId = null;

/**
 * Load vehicles with filter
 */
async function loadVehicles(filter = "pending") {
    try {
        currentVehicleFilter = filter;

        const vehicles = await apiGet(`/vehicles?filter=${filter}`);

        allVehiclesData = vehicles;
        displayVehicles(vehicles);

    } catch (err) {
        console.error("Error loading vehicles:", err);
        document.getElementById("vehicleList").innerHTML = `
            <div class="empty-state">
                <h3>Error loading vehicles</h3>
                <p>Please try refreshing the page</p>
            </div>
        `;
    }
}

/**
 * Display vehicles with search filtering
 */
function displayVehicles(vehicles) {
    const list = document.getElementById("vehicleList");

    let filteredVehicles = vehicles;
    if (currentVehicleSearch.trim() !== "") {
        filteredVehicles = vehicles.filter(v =>
            (v.ownerInfo?.name || "").toLowerCase().includes(currentVehicleSearch) ||
            (v.carMake || "").toLowerCase().includes(currentVehicleSearch) ||
            (v.carModel || "").toLowerCase().includes(currentVehicleSearch) ||
            (v.plateNo || "").toLowerCase().includes(currentVehicleSearch) ||
            (v.ownerId || "").toLowerCase().includes(currentVehicleSearch)
        );
    }

    let headerHTML = `
        <div class="vehicle-search-container">
            <input
                type="text"
                id="vehicleSearchInput"
                class="vehicle-search-input"
                placeholder="Search vehicles..."
                value="${currentVehicleSearch}"
            >
        </div>
        <div class="vehicle-filter-tabs">
            <div class="vehicle-filter-tab ${currentVehicleFilter === 'all' ? 'active' : ''}" onclick="window.vehicleModule.changeVehicleFilter('all')">
                All
            </div>
            <div class="vehicle-filter-tab ${currentVehicleFilter === 'pending' ? 'active' : ''}" onclick="window.vehicleModule.changeVehicleFilter('pending')">
                Pending
            </div>
            <div class="vehicle-filter-tab ${currentVehicleFilter === 'approved' ? 'active' : ''}" onclick="window.vehicleModule.changeVehicleFilter('approved')">
                Approved
            </div>
        </div>
    `;

    if (filteredVehicles.length === 0) {
        list.innerHTML = headerHTML + `
            <div class="empty-state">
                <h3>No ${currentVehicleFilter === 'all' ? '' : currentVehicleFilter.charAt(0).toUpperCase() + currentVehicleFilter.slice(1)} Vehicles Found</h3>
                <p>${currentVehicleSearch ? 'Try adjusting your search terms' : 'No vehicles found in this category'}</p>
            </div>
        `;

        const searchInput = document.getElementById("vehicleSearchInput");
        if (searchInput) {
            attachVehicleSearchListener();
            setTimeout(() => {
                searchInput.focus();
                searchInput.setSelectionRange(currentVehicleSearch.length, currentVehicleSearch.length);
            }, 0);
        }
        return;
    }

    list.innerHTML = headerHTML + `
        <div class="vehicle-table-container">
            <table class="vehicle-table">
                <thead>
                    <tr>
                        <th>Car Owner</th>
                        <th>Vehicle Name</th>
                        <th>Plate Number</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="vehicleTableBody">
                </tbody>
            </table>
        </div>
    `;

    const tbody = document.getElementById("vehicleTableBody");

    filteredVehicles.forEach(v => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${v.ownerInfo?.name || v.ownerId}</td>
            <td>${v.carMake} ${v.carModel} (${v.year})</td>
            <td>${v.plateNo}</td>
            <td>
                <span class="status-badge ${v.isVerified ? 'status-verified' : 'status-pending'}">
                    ${v.isVerified ? 'Approved' : 'Pending'}
                </span>
            </td>
            <td>
                <button class="btn-view-vehicle" onclick="window.vehicleModule.viewVehicleDetails('${v.carId}')">
                    View Details
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    const searchInput = document.getElementById("vehicleSearchInput");
    if (searchInput) {
        attachVehicleSearchListener();
        setTimeout(() => {
            searchInput.focus();
            searchInput.setSelectionRange(currentVehicleSearch.length, currentVehicleSearch.length);
        }, 0);
    }
}

/**
 * Change vehicle filter tab
 */
function changeVehicleFilter(filter) {
    currentVehicleSearch = "";
    loadVehicles(filter);
}

/**
 * Attach search input listener
 */
function attachVehicleSearchListener() {
    const searchInput = document.getElementById("vehicleSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentVehicleSearch = e.target.value.toLowerCase();
            displayVehicles(allVehiclesData);
        });
    }
}

/**
 * View vehicle details in modal
 */
async function viewVehicleDetails(carId) {
    try {
        currentVehicleId = carId;

        const vehicle = await apiGet(`/vehicles/${carId}`);

        displayVehicleModal(vehicle);

        document.getElementById("vehicleModal").style.display = "block";
    } catch (err) {
        console.error("Error viewing vehicle:", err);
        alert("Failed to load vehicle details");
    }
}

/**
 * Display vehicle details in modal
 */
function displayVehicleModal(vehicle) {
    const owner = vehicle.ownerInfo || {};

    document.getElementById("vehicleModalBody").innerHTML = `
        <div class="vehicle-detail-section">
            <h3>Car Owner Information</h3>
            <div class="vehicle-detail-row">
                <span class="vehicle-detail-label">Name:</span>
                <span class="vehicle-detail-value">${owner.name || "N/A"}</span>
            </div>
            <div class="vehicle-detail-row">
                <span class="vehicle-detail-label">User ID:</span>
                <span class="vehicle-detail-value">${owner.userID || vehicle.ownerId}</span>
            </div>
            <div class="vehicle-detail-row">
                <span class="vehicle-detail-label">Email:</span>
                <span class="vehicle-detail-value">${owner.email || "N/A"}</span>
            </div>
            <div class="vehicle-detail-row">
                <span class="vehicle-detail-label">Phone Number:</span>
                <span class="vehicle-detail-value">${owner.phoneNo || "N/A"}</span>
            </div>
            <div class="vehicle-detail-row">
                <span class="vehicle-detail-label">Occupation:</span>
                <span class="vehicle-detail-value">${owner.occupation || "N/A"}</span>
            </div>
            <div class="vehicle-detail-row">
                <span class="vehicle-detail-label">Registration Status:</span>
                <span class="vehicle-detail-value">
                    <span class="status-badge ${vehicle.isVerified ? 'status-verified' : 'status-pending'}">
                        ${vehicle.isVerified ? 'Verified' : 'Pending'}
                    </span>
                </span>
            </div>
        </div>

        <div class="vehicle-detail-section">
            <h3>Vehicle Information</h3>
            <div class="vehicle-detail-row">
                <span class="vehicle-detail-label">Car ID:</span>
                <span class="vehicle-detail-value">${vehicle.carId}</span>
            </div>
            <div class="vehicle-detail-row">
                <span class="vehicle-detail-label">Car Maker & Model:</span>
                <span class="vehicle-detail-value">${vehicle.carMake} ${vehicle.carModel}</span>
            </div>
            <div class="vehicle-detail-row">
                <span class="vehicle-detail-label">Year:</span>
                <span class="vehicle-detail-value">${vehicle.year}</span>
            </div>
            <div class="vehicle-detail-row">
                <span class="vehicle-detail-label">Plate Number:</span>
                <span class="vehicle-detail-value">${vehicle.plateNo}</span>
            </div>
            <div class="vehicle-detail-row">
                <span class="vehicle-detail-label">Seating Capacity:</span>
                <span class="vehicle-detail-value">${vehicle.cap || vehicle.seats || "N/A"}</span>
            </div>

            ${vehicle.carPhoto ? `
                <div class="vehicle-image-container">
                    <img src="../${vehicle.carPhoto}" alt="${vehicle.carMake} ${vehicle.carModel}" onerror="this.src='../images/placeholder-car.png'">
                    <p class="vehicle-image-label">Vehicle Photo</p>
                </div>
            ` : ''}
        </div>
    `;

    const approveBtn = document.getElementById("approveVehicleBtn");
    const rejectBtn = document.getElementById("rejectVehicleBtn");

    if (vehicle.isVerified) {
        approveBtn.disabled = true;
        approveBtn.textContent = "Already Approved";
        rejectBtn.disabled = false;
        rejectBtn.textContent = "Revoke Approval";
    } else {
        approveBtn.disabled = false;
        approveBtn.textContent = "Approve";
        rejectBtn.disabled = false;
        rejectBtn.textContent = "Reject";
    }
}

/**
 * Update vehicle verification status
 */
async function updateVehicle(status) {
    const carId = currentVehicleId;

    if (!carId) {
        alert("No vehicle selected");
        return;
    }

    const action = status ? "approve" : "reject";
    if (!confirm(`Are you sure you want to ${action} this vehicle registration?`)) {
        return;
    }

    try {
        await apiPatch(`/vehicles/${carId}`, { isVerified: status });

        alert(`Vehicle registration ${status ? "approved" : "rejected"}!`);
        closeVehicleModal();
        loadVehicles(currentVehicleFilter);
    } catch (err) {
        console.error("Error updating vehicle:", err);
        alert("Failed to update vehicle registration");
    }
}

export { loadVehicles, viewVehicleDetails, updateVehicle, changeVehicleFilter };
