console.log("admin-dashboard.js loaded");

const API = "http://localhost:4000/api/admin";

// User variables
let currentFilter = "all"; // default filter for Users
let currentSearch = "";
// Report variables
let allReports = [];
let currentComplaintId = [];
// Vehicle variables
let currentVehicleId = null;
let currentVehicleFilter = "pending"; // Default filter
let currentVehicleSearch = ""; // Current search query
let allVehiclesData = []; // Store all vehicles for filtering

// Panel switching
document.addEventListener("DOMContentLoaded", () => {
    checkAdminSession();

    // Tab switching
    const sectionCards = document.querySelectorAll(".section-card");
    const windows = document.querySelectorAll(".content-window");
    const searchInput = document.getElementById("userSearchInput");
    
    // Search listener
    searchInput.addEventListener("input", () => {
        currentSearch = searchInput.value.toLowerCase();
        loadUsers(currentFilter, currentSearch);
    });

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
    
    // Filter button for All, Verified, and Unverified
    const filterTabs = document.querySelectorAll(".filter-tab");
    filterTabs.forEach(tab => {
        tab.addEventListener("click", () => {

        // Update active tab UI
        filterTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        // Get filter type
        currentFilter = tab.dataset.filter; // Save current filter

        // Reload user list with filter
        loadUsers(currentFilter, currentSearch);
    });
});

    // Load default tab (User Accounts)
    loadUsers("all");
});

// Session check
async function checkAdminSession() {
    try {
        const res = await fetch(`${API}/dashboard`, { credentials: "include" });
        if (!res.ok) {
            alert("Session expired. Please login again.");
            window.location.href = "../login.html";
        }
    } catch (err) {
        console.error("Session check error:", err);
        window.location.href = "../login.html";
    }
}

checkAdminSession();

// Users functions
async function loadUsers(filter = "all", search = "") {
    try {
        const res = await fetch(`${API}/users`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch users");
        const users = await res.json();

        let filtered = users; // Filter the users by status

        if (filter === "verified") {
            filtered = users.filter(u => u.isVerified === true);
        } 
        else if (filter === "unverified") {
            filtered = users.filter(u => u.isVerified === false);
        }

        // Applying search
        if (search.trim() !== "") {
            filtered = filtered.filter(u => 
            u.name.toLowerCase().includes(search) ||
            u.userID.toLowerCase().includes(search) ||
            u.roles.join(", ").toLowerCase().includes(search)
        );
    }

        const list = document.getElementById("userList");
        list.innerHTML = "";


        filtered.forEach(u => {
            list.innerHTML += `
                <div class="user-card">

                    <div class="info">
                        <div class="name">${u.name}</div>
                        <div class="role">(${u.roles.join(", ")})</div>
                    </div>

                    <div class="status">
                        ${u.isVerified ? "Verified" : "Unverified"}
                    </div>

                    <button class="view-btn" onclick="viewUserDetails('${u.userID}')">
                        View Details
                    </button>

                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

async function viewUserDetails(userID) {
    try {
        const res = await fetch(`${API}/users/${userID}`, { credentials: "include" });
        console.log("Response status:", res.status, "Content-Type:", res.headers.get("content-type"));
        if (!res.ok) throw new Error("Failed to fetch user: " + res.status);
        const u = await res.json();

        // Fill modal fields
        document.getElementById("modalName").textContent = u.name;
        document.getElementById("modalEmail").textContent = `Email: ${u.email}`;
        document.getElementById("modalPhone").textContent = `Phone: ${u.phoneNo}`;
        document.getElementById("modalOccupation").textContent = `Occupation: ${u.occupation}`;
        document.getElementById("modalRoles").textContent = `Roles: ${u.roles.join(", ")}`;
        document.getElementById("modalStatus").innerHTML = `Status: <b>${u.isVerified ? "Verified" : "Unverified"}</b>`;
        
        
        // Images for driver roles 
        if (u.roles.includes("driver") && u.driverDocs) {

            // Profile image
            document.getElementById("profilePicBox").innerHTML = `
            <img src="../${u.driverDocs.profileImage}">
            <p class="img-label">Profile Picture</p>
            `;
            
            // License image
            document.getElementById("licensePicBox").innerHTML = `
            <img src="../${u.driverDocs.licenseImage}">
            <p class="img-label">License</p>
            `;
            
            // Vehicle registration
            document.getElementById("vehiclePicBox").innerHTML = `
            <img src="../${u.driverDocs.vehicleRegImage}">
            <p class="img-label">Vehicle Registration</p>
            `;
        
        } else {
            // Clear if NOT a driver
            document.getElementById("licensePicBox").innerHTML = "";
            document.getElementById("vehiclePicBox").innerHTML = "";
        }

        // Buttons
        document.getElementById("verifyBtn").onclick = () => updateUserVerification(u.userID, true);
        document.getElementById("revokeBtn").onclick = () => updateUserVerification(u.userID, false);

        // Auto-hide/show buttons based on verification
        if (u.isVerified) {
            document.getElementById("verifyBtn").style.display = "none";
            document.getElementById("rejectBtn").style.display = "none";
            document.getElementById("revokeBtn").style.display = "block";
        } else {
            document.getElementById("verifyBtn").style.display = "block";
            document.getElementById("rejectBtn").style.display = "block"; // No functionality yet
            document.getElementById("revokeBtn").style.display = "none";
        }

        showUserModalUI(true);
        document.getElementById("modalContent").style.display = "none";


        openModal();

    } catch (err) {
        console.error(err);
    }
}

async function updateUserVerification(userID, status) {
    try {
        await fetch(`${API}/users/${userID}/verify`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ isVerified: status })
        });
        closeModal();
        
        // Reload users using the current filter 
        loadUsers(currentFilter, currentSearch);
    } catch (err) {
        console.error(err);
    }
}

// ========================================
// VEHICLE REGISTRATION FUNCTIONS
// ========================================
// Load vehicles with filter
async function loadVehicles(filter = "pending") {
    try {
        currentVehicleFilter = filter;
        
        const res = await fetch(`${API}/vehicles?filter=${filter}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch vehicles");
        const vehicles = await res.json();
        
        allVehiclesData = vehicles; // Store for search filtering
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


// Display vehicles with search and filter
function displayVehicles(vehicles) {
    const list = document.getElementById("vehicleList");
    

    // Apply search filter
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


    // Build search bar and filter tabs
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
            <div class="vehicle-filter-tab ${currentVehicleFilter === 'all' ? 'active' : ''}" onclick="changeVehicleFilter('all')">
                All
            </div>
            <div class="vehicle-filter-tab ${currentVehicleFilter === 'pending' ? 'active' : ''}" onclick="changeVehicleFilter('pending')">
                Pending
            </div>
            <div class="vehicle-filter-tab ${currentVehicleFilter === 'approved' ? 'active' : ''}" onclick="changeVehicleFilter('approved')">
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
        
        // Re-attach search listener and refocus
        const searchInput = document.getElementById("vehicleSearchInput");
        if (searchInput) {
            attachVehicleSearchListener();
            // Restore cursor position
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
                <button class="btn-view-vehicle" onclick="viewVehicleDetails('${v.carId}')">
                    View Details
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Attach search listener after rendering and restore focus
    const searchInput = document.getElementById("vehicleSearchInput");
    if (searchInput) {
        attachVehicleSearchListener();
        // Restore focus and cursor position
        setTimeout(() => {
            searchInput.focus();
            searchInput.setSelectionRange(currentVehicleSearch.length, currentVehicleSearch.length);
        }, 0);
    }
}

// Change filter tab
function changeVehicleFilter(filter) {
    currentVehicleSearch = ""; // Reset search when changing filter
    loadVehicles(filter);
}

// Attach search input listener
function attachVehicleSearchListener() {
    const searchInput = document.getElementById("vehicleSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentVehicleSearch = e.target.value.toLowerCase();
            displayVehicles(allVehiclesData);
        });
    }
}

// View vehicle details in modal
async function viewVehicleDetails(carId) {
    try {
        currentVehicleId = carId;
        
        const res = await fetch(`${API}/vehicles/${carId}`, { 
            credentials: "include" 
        });
        
        if (!res.ok) throw new Error("Failed to fetch vehicle details");
        
        const vehicle = await res.json();
        displayVehicleModal(vehicle);
        
        document.getElementById("vehicleModal").style.display = "block";
    } catch (err) {
        console.error("Error viewing vehicle:", err);
        alert("Failed to load vehicle details");
    }
}


// Display vehicle details in modal
function displayVehicleModal(vehicle) {
    const owner = vehicle.ownerInfo || {};
    
    // Dynamically generate content
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

    // Update approve/reject buttons based on verification status
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

// Update vehicle verification status
async function updateVehicle(status) {
    const carId = currentVehicleId;

    // Error handling
    if (!carId) {
        alert("No vehicle selected");
        return;
    }

    const action = status ? "approve" : "reject";
    if (!confirm(`Are you sure you want to ${action} this vehicle registration?`)) {
        return;
    }

    try {
        // Send fetch request
        const res = await fetch(`${API}/vehicles/${carId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ isVerified: status })
        });

        if (!res.ok) throw new Error("Failed to update vehicle");

        alert(`Vehicle registration ${status ? "approved" : "rejected"}!`);
        closeVehicleModal();
        loadVehicles(currentVehicleFilter); // Reload the list with the current filter
    } catch (err) {
        console.error("Error updating vehicle:", err);
        alert("Failed to update vehicle registration");
    }
}

// Close vehicle modal
function closeVehicleModal() {
    document.getElementById("vehicleModal").style.display = "none";
    currentVehicleId = null;
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const vehicleModal = document.getElementById("vehicleModal");
    if (event.target === vehicleModal) {
        closeVehicleModal();
    }
});

// ========================================
// REPORTS & COMPLAINTS FUNCTIONS
// ========================================
// Load all reports
async function loadReports() {
    try {
        const res = await fetch(`${API}/reports`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch reports");
        
        allReports = await res.json();
        displayReports(allReports);
    } catch (err) {
        console.error("Error loading reports:", err);
        document.getElementById("reportList").innerHTML = `
            <div class="empty-state">
                <h3>Error loading reports</h3>
                <p>Please try refreshing the page</p>
            </div>
        `;
    }
}

// Display reports in the list
function displayReports(reports) {
    const list = document.getElementById("reportList");

    // Save current filder
    const currentFilter = document.getElementById("statusFilter")?.value || "all";

    if (reports.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <h3>No reports found</h3>
                <p>There are no reports matching your filter criteria</p>
            </div>
        `;
        return;
    }

    list.innerHTML = `
        <header class="page-header">
            <h1>Reports & Complaints</h1>
            <p>Displaying all submitted reports</p>
        </header>

        <div class="filters">
            <div>
                <label for="statusFilter">Filter by Status:</label>
                <select id="statusFilter" onchange="filterReports()">
                    <option value="all">All Reports</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                </select>
            </div>
        </div>

        <div class="report-list-container" id="reportCards"></div>
    `;

    // Restore the previously selected filter
    document.getElementById("statusFilter").value = currentFilter;

    const cardsContainer = document.getElementById("reportCards");
    
    
    reports.forEach(r => {
        const status = r.status || "pending";
        const statusClass = `status-${status.toLowerCase()}`;
        
        const card = document.createElement("div");
        card.className = "report-card";
        
        
        card.innerHTML = `
            <div class="report-info">
                <p><b>Complaint ID:</b> ${r.complaintId}</p>
                <p><b>Passenger:</b> ${r.passengerName} (${r.passengerId})</p>
                <p><b>Driver:</b> ${r.driverName} (${r.driverId})</p>
                <p><b>Issue:</b> ${(r.complaintMessage || "").substring(0, 60)}${(r.complaintMessage || "").length > 60 ? "..." : ""}</p>
            </div>
            
            <div class="report-footer">
                <div class="status-wrapper">
                    <span class="status-badge ${statusClass}">${status.toUpperCase()}</span>
                </div>

                <div class="actions-wrapper">
                    <button class="btn btn-view" onclick="viewReport('${r.complaintId}')">
                        View Details
                    </button>
                    <button class="btn btn-resolve"
                        onclick="markAsResolved('${r.complaintId}')"
                        ${status === "resolved" ? "disabled" : ""}>
                        ${status === "resolved" ? "Resolved" : "Resolve"}
                    </button>
                </div>
            </div>
        `;
        cardsContainer.appendChild(card);
    });
}

// Filter reports by status
function filterReports() {
    const filter = document.getElementById("statusFilter").value;
    
    if (filter === "all") {
        displayReports(allReports);
        return;
    } else {
        const filtered = allReports.filter(r => 
            (r.status || "pending").toLowerCase() === filter.toLowerCase()
        );
        displayReports(filtered);
    }
}

// View report details in modal
async function viewReport(complaintId) {
    try {
        currentComplaintId = complaintId;
        
        // Fetch request to the backend
        const res = await fetch(`${API}/reports/${complaintId}`, { 
            credentials: "include" 
        });
        
        if (!res.ok) throw new Error("Failed to fetch report details");
        
        const report = await res.json();
        displayReportModal(report);
        
        document.getElementById("reportModal").style.display = "block";
    } catch (err) {
        console.error("Error viewing report:", err);
        alert("Failed to load report details");
    }
}

// Code for displaying the modal information
function displayReportModal(report) {
    const status = report.status || "pending";
    const statusClass = `status-${status.toLowerCase()}`;

    document.getElementById("modalBody").innerHTML = `
        <div class="detail-section">
            <h3>Complaint Information</h3>
            <div class="detail-row"><span class="detail-label">Complaint ID:</span> <span class="detail-value">${report.complaintId}</span></div>
            <div class="detail-row"><span class="detail-label">Ride ID:</span> <span class="detail-value">${report.rideId || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Status:</span> <span class="status-badge ${statusClass}">${status}</span></div>
            <div class="detail-row"><span class="detail-label">Complaint Message:</span></div>
            <div class="complaint-text">${report.complaintMessage || "No message provided"}</div>
        </div>

        <div class="detail-section">
            <h3>Complainant Details</h3>
            <div class="detail-row"><span class="detail-label">Name:</span> <span class="detail-value">${report.passengerName || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Occupation:</span> <span class="detail-value">${report.passengerOccupation || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">ID Number:</span> <span class="detail-value">${report.passengerId}</span></div>
            <div class="detail-row"><span class="detail-label">Contact Number:</span> <span class="detail-value">${report.passengerPhone || report.passengerContact || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Email:</span> <span class="detail-value">${report.passengerEmail || "N/A"}</span></div>
        </div>

        <div class="detail-section">
            <h3>Driver Details</h3>
            <div class="detail-row"><span class="detail-label">Name:</span> <span class="detail-value">${report.driverName || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Occupation:</span> <span class="detail-value">${report.driverOccupation || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">ID Number:</span> <span class="detail-value">${report.driverId}</span></div>
            <div class="detail-row"><span class="detail-label">Contact Number:</span> <span class="detail-value">${report.driverPhone || report.driverContact || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Email:</span> <span class="detail-value">${report.driverEmail || "N/A"}</span></div>
        </div>

        <div class="detail-section">
            <h3>Vehicle Information</h3>
            <div class="detail-row"><span class="detail-label">Car ID:</span> <span class="detail-value">${report.carId || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Maker & Model:</span> <span class="detail-value">${report.carMake || ""} ${report.carModel || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Plate Number:</span> <span class="detail-value">${report.plateNo || "N/A"}</span></div>
        </div>

        <div class="detail-section">
            <h3>Ride Information</h3>
            <div class="detail-row"><span class="detail-label">Route:</span> <span class="detail-value">${report.rideOrigin || "N/A"} → ${report.rideDestination || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Date:</span> <span class="detail-value">${report.rideDate || "N/A"}</span></div>
        </div>
    `;

    // Update resolve button state
    const resolveBtn = document.getElementById("resolveBtn");
    if (resolveBtn) {
        resolveBtn.disabled = status === "resolved";
        resolveBtn.textContent = status === "resolved" ? "Already Resolved" : "Mark as Resolved";
    }
}


// Mark report as resolved
async function markAsResolved(complaintId = null) {
    const id = complaintId || currentComplaintId;
    
    if (!id) {
        alert("No complaint selected");
        return;
    }

    if (!confirm("Are you sure you want to mark this report as resolved?")) {
        return;
    }

    try {
        const res = await fetch(`${API}/reports/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status: "resolved" })
        });

        if (!res.ok) throw new Error("Failed to update report");

        alert("Report marked as resolved!");
        closeReportModal();
        loadReports(); // Reload the list
    } catch (err) {
        console.error("Error resolving report:", err);
        alert("Failed to resolve report");
    }
}

// Close report modal
function closeReportModal() {
    document.getElementById("reportModal").style.display = "none";
    currentComplaintId = null;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById("reportModal");
    if (event.target === modal) {
        closeReportModal();
    }
}

// Active Rides
async function loadRides() {
    try {
        const res = await fetch(`${API}/rides/active`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch rides");
        const rides = await res.json();

        const list = document.getElementById("rideList");
        list.innerHTML = "";

        rides.forEach(r => {
            list.innerHTML += `
                <div class="user-card">
                    <p>Ride: ${r.rideId}</p>
                    <p>Driver: ${r.driverId}</p>
                    <button onclick="reviewBookings('${r.rideId}')">Review Bookings</button>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

async function reviewBookings(rideId) {
    try {
        const res = await fetch(`${API}/bookings/${rideId}`, { credentials: "include" });
        const bookings = await res.json();

        let html = `<h3>Bookings for Ride ${rideId}</h3>`;
        bookings.forEach(b => {
            html += `
                <p>
                  Passenger: ${b.passengerId}<br>
                  Seats: ${b.seatNo}<br>
                  Price: ₱${b.price}<br>
                  Status: ${b.status}
                </p><hr>
            `;
        });

       // Switch modal to "ride mode"
        showUserModalUI(false);

        document.getElementById("modalName").textContent = `Ride ${rideId}`;
        document.getElementById("modalContent").innerHTML = html;
        document.getElementById("modalContent").style.display = "block";

        openModal();
    } catch (err) {
        console.error(err);
    }
}

// Modal Helpers 
function openModal() {
    document.getElementById("modalOverlay").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modalOverlay").classList.add("hidden");
}

// Modal to hide on overlay click
function showUserModalUI(show) {
    const display = show ? "block" : "none";

    // USER INFO (first modal-info block)
    document.querySelectorAll(".modal-info")[0].style.display = display;

    // BUTTON CONTAINER (this is what was missing)
    document.querySelector(".modal-buttons").style.display = display;

    // IMAGE CONTAINER
    document.querySelector(".picture-container").style.display = display;
}

function closeModal() {
    document.getElementById("modalOverlay").classList.add("hidden");

    // Reset modal for next use
    showUserModalUI(true);
    document.getElementById("modalContent").innerHTML = "";
    document.getElementById("modalContent").style.display = "none";
}




// Initialise functions
checkAdminSession();
loadUsers();
loadVehicles();
loadReports();
loadRides();
