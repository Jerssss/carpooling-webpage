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

    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
        console.warn("Logout button not found");
        return;
    }

    logoutBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to logout?")) return;

        try {
            const res = await fetch(`${API}/logout`, {
                method: "POST",
                credentials: "include"
            });

            if (res.ok) {
                window.location.href = "/9467_it312-teamarc_midtermproject/login.html";
            } else {
                alert("Logout failed. Please try again.");
            }
        } catch (err) {
            console.error("Logout error:", err);
            alert("Server error during logout.");
        }
    });
});

// Session check
async function checkAdminSession() {
    try {
        const res = await fetch(`${API}/dashboard`, { credentials: "include" });
        if (!res.ok) {
            alert("Session expired. Please login again.");
            window.location.href = "/9467_it312-teamarc_midtermproject/login.html";
        }
    } catch (err) {
        console.error("Session check error:", err);
        window.location.href = "/9467_it312-teamarc_midtermproject/login.html";
    }
}

// User FUNCTIONS
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
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(u => 
            u.name.toLowerCase().includes(searchLower) ||
            u.userID.toLowerCase().includes(searchLower) ||
            u.roles.join(", ").toLowerCase().includes(searchLower)
        );
    }

        const list = document.getElementById("userList");
        // If no users found
        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <p>No users found</p>
                </div>
            `;
            return;
        }

        // Build table rows
        list.innerHTML = filtered.map(u => `
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
                    <button class="view-details-btn" onclick="viewUserDetails('${u.userID}')">
                        View Details
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function viewUserDetails(userID) {
    try {
        const res = await fetch(`${API}/users/${userID}`, { credentials: "include" });
        console.log("Response status:", res.status, "Content-Type:", res.headers.get("content-type"));
        if (!res.ok) throw new Error("Failed to fetch user: " + res.status);
        // Variable storing fetched data
        const u = await res.json();

        // Fill modal header
        document.getElementById("modalUserName").textContent = u.name;

        // Fill modal details
        document.getElementById("modalUserID").textContent = u.userID;
        document.getElementById("modalName").textContent = u.name;
        document.getElementById("modalEmail").textContent = u.email;
        document.getElementById("modalPhone").textContent = u.phoneNo;
        document.getElementById("modalOccupation").textContent = u.occupation || "N/A";
        document.getElementById("modalRoles").textContent = u.roles ? u.roles.join(", ") : "N/A";
        
        // Status with styling
        const statusElement = document.getElementById("modalStatus");
        statusElement.textContent = u.isVerified ? "Verified" : "Unverified";
        statusElement.className = u.isVerified ? "detail-value verified" : "detail-value unverified";
        
        // Handle documents section
        const documentsGrid = document.getElementById("documentsGrid");
        const documentsSection = document.getElementById("documentsSection");

        // Clear previous documents
        documentsGrid.innerHTML = "";

       // Check if user is a driver
       const isDriver = u.roles && u.roles.includes("driver");

        if (isDriver && u.driverDocs) {
            // Driver: Show 3 images (Profile, License, Vehicle Registration)
            documentsGrid.className = "documents-grid"; // 3 columns
            
            // Profile Picture
            documentsGrid.innerHTML += `
                <div class="document-box">
                    <img src="../${u.picture || 'images/profile_pics/default-pic.png'}" 
                         alt="Profile Picture"
                         onerror="this.src='../images/profile_pics/default-pic.png'">
                    <div class="document-label">Profile Picture</div>
                </div>
            `;
            
            // Driver's License
            documentsGrid.innerHTML += `
                <div class="document-box">
                    <img src="../${u.driverDocs.licenseImage || 'images/fallback_pics/default-license.png'}" 
                         alt="Driver's License"
                         onerror="this.src='../images/fallback_pics/default-license.png'">
                    <div class="document-label">Driver's License</div>
                </div>
            `;
            
            // Vehicle Registration
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
            // Passenger: Show only profile picture
            documentsGrid.className = "documents-grid two-column"; // 2 columns for centering
            
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

        // Handle action buttons
        const verifyBtn = document.getElementById("verifyBtn");
        const revokeBtn = document.getElementById("revokeBtn");

        verifyBtn.onclick = () => updateUserVerification(u.userID, true);
        revokeBtn.onclick = () => updateUserVerification(u.userID, false);

        // Show/hide buttons based on verification status
        if (u.isVerified) {
            verifyBtn.style.display = "none";
            revokeBtn.style.display = "block";
        } else {
            verifyBtn.style.display = "block";
            revokeBtn.style.display = "none";
        }

        // Show modal
        openUserModal();

    } catch (err) {
        console.error("Error viewing user details:", err);
        alert("Failed to load user details. Please try again.");
    }
}

async function updateUserVerification(userID, status) {
    try {
        const res = await fetch(`${API}/users/${userID}/verify`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ isVerified: status })
        });

        if (!res.ok) throw new Error("Failed to update user verification");

        // Close modal
        closeUserModal();
        
        // Reload users with current filter
        loadUsers(currentFilter, currentSearch);
        
        // Show success message (optional)
        console.log(`User ${userID} ${status ? 'verified' : 'unverified'} successfully`);
        
    } catch (err) {
        console.error("Error updating user verification:", err);
        alert("Failed to update user verification. Please try again.");
    }
}

function openUserModal() {
    document.getElementById("userModal").classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Prevent background scrolling
}

function closeUserModal() {
    document.getElementById("userModal").classList.add("hidden");
    document.body.style.overflow = "auto"; // Restore scrolling
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById("userModal");
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeUserModal();
            }
        });
    }
});


// VEHICLE REGISTRATION FUNCTIONS

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

// REPORTS & COMPLAINTS FUNCTIONS

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

// MONITOR ACTIVE RIDES FUNCTIONS

async function loadRides() {
    try {
        // Create fetch request to backend
        const res = await fetch(`${API}/rides/active`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch rides");
        // Store fetched data
        const rides = await res.json();

        const list = document.getElementById("rideList");
        
        // If no active rides
        if (rides.length === 0) {
            list.innerHTML = `
                <div class="rides-empty-state">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                        <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
                    </svg>
                    <h3>No Active Rides</h3>
                    <p>There are currently no ongoing carpools</p>
                </div>
            `;
            return;
        }

        // Build ride cards and generate dynamic content
        list.innerHTML = rides.map(ride => `
            <div class="ride-card">
                <div class="ride-card-header">
                    <div class="ride-id">${ride.rideId}</div>
                    <div class="ride-status-badge">${ride.status}</div>
                </div>
                
                <div class="ride-card-body">
                    <div class="ride-info-row">
                        <div class="ride-info-icon">👤</div>
                        <div class="ride-info-content">
                            <div class="ride-info-label">Driver</div>
                            <div class="ride-info-value" id="driver-${ride.rideId}">Loading...</div>
                        </div>
                    </div>
                    
                    <div class="ride-info-row">
                        <div class="ride-info-icon">📍</div>
                        <div class="ride-info-content">
                            <div class="ride-info-label">Destination</div>
                            <div class="ride-info-value destination-text">${truncateText(ride.destination, 50)}</div>
                        </div>
                    </div>
                    
                    <div class="ride-info-row">
                        <div class="ride-info-icon">📅</div>
                        <div class="ride-info-content">
                            <div class="ride-info-label">Schedule</div>
                            <div class="ride-info-value">${ride.date}</div>
                        </div>
                    </div>
                </div>
                
                <div class="ride-card-footer">
                    <button class="view-ride-btn" onclick="viewRideDetails('${ride.rideId}')">
                        View Details
                    </button>
                </div>
            </div>
        `).join('');

        // Load driver names for each ride
        rides.forEach(ride => loadDriverName(ride.driverId, ride.rideId));

    } catch (err) {
        console.error("Error loading rides:", err);
        const list = document.getElementById("rideList");
        list.innerHTML = `
            <div class="rides-empty-state">
                <h3>Error Loading Rides</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Helper function to load driver name
async function loadDriverName(driverId, rideId) {
    try {
        const res = await fetch(`${API}/users/${driverId}`, { credentials: "include" });
        if (res.ok) {
            const driver = await res.json();
            const element = document.getElementById(`driver-${rideId}`);
            if (element) {
                element.textContent = driver.name;
            }
        }
    } catch (err) {
        console.error("Error loading driver name:", err);
        const element = document.getElementById(`driver-${rideId}`);
        if (element) {
            element.textContent = driverId;
        }
    }
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// View detailed ride information
async function viewRideDetails(rideId) {
    try {
        // Fetch ride details
        const rideRes = await fetch(`${API}/rides/active`, { credentials: "include" });
        if (!rideRes.ok) throw new Error("Failed to fetch ride");
        const rides = await rideRes.json();
        const ride = rides.find(r => r.rideId === rideId);
        
        if (!ride) throw new Error("Ride not found");

        // Fetch driver details
        const driverRes = await fetch(`${API}/users/${ride.driverId}`, { credentials: "include" });
        const driver = driverRes.ok ? await driverRes.json() : null;

        // Fetch vehicle details
        const vehicleRes = await fetch(`${API}/vehicles`, { credentials: "include" });
        const vehicles = vehicleRes.ok ? await vehicleRes.json() : [];
        const vehicle = vehicles.find(v => v.carId === ride.carId);

        // Populate modal header
        document.getElementById("modalRideTitle").textContent = `Ride ${ride.rideId}`;
        document.getElementById("modalRideSubtitle").textContent = `Status: ${ride.status}`;

        // Populate ride information
        document.getElementById("detailRideId").textContent = ride.rideId;
        document.getElementById("detailDriver").textContent = driver 
            ? `${driver.name} (${driver.userID})` 
            : ride.driverId;
        document.getElementById("detailCarModel").textContent = vehicle 
            ? `${vehicle.carMake} ${vehicle.carModel} (${vehicle.carId})` 
            : ride.carId;
        document.getElementById("detailPlateNumber").textContent = vehicle 
            ? vehicle.plateNo 
            : 'N/A';

        // Populate trip details
        document.getElementById("detailDate").textContent = ride.date || 'N/A';
        document.getElementById("detailDepartureTime").textContent = ride.departureTime || 'N/A';
        document.getElementById("detailStationedAt").textContent = ride.stationedAt || 'N/A';
        document.getElementById("detailDestination").textContent = ride.destination || 'N/A';
        document.getElementById("detailAvailableSeats").textContent = 
            `${ride.availableSeats} / ${ride.availableSeats + (ride.bookedSeats || 0)} total`;
        document.getElementById("detailPurpose").textContent = ride.for || 'N/A';
        document.getElementById("detailPrice").textContent = `₱${ride.price || 0}`;

        // Populate passengers
        const passengersList = document.getElementById("passengersList");
        
        if (!ride.passengers || ride.passengers.length === 0) {
            passengersList.innerHTML = `
                <div class="no-passengers">
                    No passengers booked yet
                </div>
            `;
        } else {
            // Fetch all passenger details
            const passengerPromises = ride.passengers.map(async (passenger) => {
                try {
                    const userRes = await fetch(`${API}/users/${passenger.userId}`, { credentials: "include" });
                    if (userRes.ok) {
                        const user = await userRes.json();
                        return {
                            ...passenger,
                            name: user.name,
                            occupation: user.occupation,
                            userID: user.userID
                        };
                    }
                    return passenger;
                } catch (err) {
                    return passenger;
                }
            });

            const passengersWithDetails = await Promise.all(passengerPromises);

            passengersList.innerHTML = passengersWithDetails.map((passenger, index) => `
                <div class="passenger-card">
                    <div class="passenger-header">
                        <div class="passenger-name">Passenger ${index + 1}</div>
                        <div class="seat-badge">Seat ${passenger.seatNumber}</div>
                    </div>
                    <div class="passenger-details">
                        <span class="detail-label">ID:</span>
                        <span class="detail-value">${passenger.userID || passenger.userId}</span>
                        
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${passenger.name || 'N/A'}</span>
                        
                        <span class="detail-label">Occupation:</span>
                        <span class="detail-value">${passenger.occupation || 'N/A'}</span>
                        
                        <span class="detail-label">Booked At:</span>
                        <span class="detail-value">${formatDate(passenger.bookingTime)}</span>
                    </div>
                </div>
            `).join('');
        }

        // Show modal
        openRideModal();

    } catch (err) {
        console.error("Error viewing ride details:", err);
        alert("Failed to load ride details. Please try again.");
    }
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (err) {
        return dateString;
    }
}

// Modal control functions
function openRideModal() {
    document.getElementById("rideModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeRideModal() {
    document.getElementById("rideModal").classList.add("hidden");
    document.body.style.overflow = "auto";
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById("rideModal");
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeRideModal();
            }
        });
    }
    
    // Load rides on page load
    loadRides();
});


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
loadUsers();
loadVehicles();
loadReports();
loadRides();
