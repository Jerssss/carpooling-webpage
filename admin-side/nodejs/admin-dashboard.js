console.log("admin-dashboard.js loaded");

const API = "http://localhost:4000/api/admin";

let currentFilter = "all"; // default filter for Users
let currentSearch = "";

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

// Vehicles functions
async function loadVehicles() {
    try {
        const res = await fetch(`${API}/vehicles/pending`, { credentials: "include" });
        const vehicles = await res.json();

        const list = document.getElementById("vehicleList");
        list.innerHTML = "";

        vehicles.forEach(v => {
            list.innerHTML += `
                <div class="vehicle-card">
                    <p>${v.carMake} ${v.carModel} (${v.year})</p>
                    <p>Plate: ${v.plateNo}</p>
                    <p>Status: ${v.isVerified ? "Verified" : "Pending"}</p>

                    <button onclick="updateVehicle('${v.carId}', true)">Approve</button>
                    <button onclick="updateVehicle('${v.carId}', false)">Reject</button>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

async function updateVehicle(carId, status) {
    try {
        await fetch(`${API}/vehicles/${carId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ isVerified: status })
        });
        loadVehicles();
    } catch (err) {
        console.error(err);
    }
}

// Reports
async function loadReports() {
    try {
        const res = await fetch(`${API}/reports`, { credentials: "include" });
        const reports = await res.json();

        const list = document.getElementById("reportList");
        list.innerHTML = "";

        reports.forEach(r => {
            list.innerHTML += `
                <div class="user-card">
                    <div class="info">
                        <p><b>Passenger:</b> ${r.passengerId}</p>
                        <p><b>Driver:</b> ${r.driverId}</p>
                        <p><b>Issue:</b> ${r.report_description}</p>
                        <p>Status: ${r.status}</p>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
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

        document.getElementById("modalContent").innerHTML = html;
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


// Initialise functions
checkAdminSession();
loadUsers();
loadVehicles();
loadReports();
loadRides();
