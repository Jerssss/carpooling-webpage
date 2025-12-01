console.log("admin-dashboard.js loaded");

const API = "http://localhost:4000/api/admin";

// Panel switching
document.addEventListener("DOMContentLoaded", () => {
    checkAdminSession();

    // Tab switching
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

    // Load default tab (User Accounts)
    loadUsers();
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
async function loadUsers() {
    try {
        const res = await fetch(`${API}/users`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch users");
        const users = await res.json();

        const list = document.getElementById("userList");
        list.innerHTML = "";

        users.forEach(u => {
            list.innerHTML += `
                <div class="user-card">
                    <p><b>${u.name}</b> (${u.roles.join(", ")})</p>
                    <p>Status: ${u.isVerified ? "Verified" : "Unverified"}</p>
                    <button onclick="viewUserDetails('${u.userID}')">View Details</button>
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
        const u = await res.json();

        document.getElementById("modalContent").innerHTML = `
            <h3>${u.name}</h3>
            <p>Email: ${u.email}</p>
            <p>Phone: ${u.phoneNo}</p>
            <p>Occupation: ${u.occupation}</p>
            <p>Roles: ${u.roles.join(", ")}</p>
            <p>Status: <b>${u.isVerified ? "Verified" : "Unverified"}</b></p>

            ${u.driverDocs ? `
              <img src="../${u.driverDocs.licenseImage}" width="100">
              <img src="../${u.driverDocs.vehicleRegImage}" width="100">
            ` : ""}

            <br><br>
            <button onclick="updateUserVerification('${u.userID}', true)">Verify</button>
            <button onclick="updateUserVerification('${u.userID}', false)">Unverify</button>
        `;

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
        loadUsers();
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
        await fetch(`${API}/vehicles/${carId}/approve`, {
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
