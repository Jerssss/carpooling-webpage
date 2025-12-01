const API = "http://localhost:4000/api/admin";

document.addEventListener("DOMContentLoaded", () => {
    const sectionButtons = document.querySelectorAll(".section-btn");
    const windows = document.querySelectorAll(".content-window");

    sectionButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            // remove active state
            sectionButtons.forEach(b => b.classList.remove("active"));
            windows.forEach(w => w.classList.remove("active"));

            // activate selected
            btn.classList.add("active");
            document.getElementById(btn.dataset.target).classList.add("active");
        });
    });

    // load initial data
    loadUsers();
});


async function checkAdminSession() {
    const res = await fetch("http://localhost:4000/api/admin/dashboard", {
        credentials: "include"
    });

    if (!res.ok) {
        alert("Session expired. Please login again.");
        window.location.href = "../login.html"; // or your login page
    }
}

checkAdminSession();

async function loadUsers() {
    const res = await fetch("http://localhost:4000/api/admin/users", {
        credentials: "include"
    });
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
}

async function viewUserDetails(userID) {
    const res = await fetch(`http://localhost:4000/api/admin/users/${userID}`, {
        credentials: "include"
    });
    const u = await res.json();

    document.getElementById("modalContent").innerHTML = `
        <h3>${u.name}</h3>
        <p>Email: ${u.email}</p>
        <p>Phone: ${u.phoneNo}</p>
        <p>Occupation: ${u.occupation}</p>
        <p>Roles: ${u.roles.join(", ")}</p>
        <p>Status: <b>${u.isVerified}</b></p>

        ${u.driverDocs ? `
          <img src="../${u.driverDocs.licenseImage}" width="100">
          <img src="../${u.driverDocs.vehicleRegImage}" width="100">
        ` : ""}

        <br><br>
        <button onclick="updateUserVerification('${u.userID}', true)">Verify</button>
        <button onclick="updateUserVerification('${u.userID}', false)">Unverify</button>
    `;

    openModal();
}

async function updateUserVerification(userID, status) {
    await fetch(`http://localhost:4000/api/admin/users/${userID}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isVerified: status })
    });

    closeModal();
    loadUsers(); // refresh UI
}

// Vehicles
async function loadVehicles() {
    const res = await fetch("http://localhost:4000/api/admin/vehicles/pending", {
        credentials: "include"
    });
    const vehicles = await res.json();

    const list = document.getElementById("vehicleList");
    list.innerHTML = "";

    vehicles.forEach(v => {
        list.innerHTML += `
            <div class="vehicle-card">
                <p>${v.carMake} ${v.carModel} (${v.year})</p>
                <p>Plate: ${v.plateNo}</p>
                <p>Status: ${v.isVerified}</p>

                <button onclick="updateVehicle('${v.carId}', true)">Approve</button>
                <button onclick="updateVehicle('${v.carId}', false)">Reject</button>
            </div>
        `;
    });
}

async function updateVehicle(carId, status) {
    await fetch(`http://localhost:4000/api/admin/vehicles/${carId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isVerified: status })
    });

    loadVehicles();
}

// Reports
async function loadReports() {
    const res = await fetch(`${API}/reports`, {
        credentials: "include"
    });
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
}

// Active Rides
async function loadRides() {
    const res = await fetch("http://localhost:4000/api/admin/rides", {
        credentials: "include"
    });
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
}
// View Bookings
async function reviewBookings(rideId) {
    const res = await fetch(`http://localhost:4000/api/admin/bookings/${rideId}`, {
        credentials: "include"
    });
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
