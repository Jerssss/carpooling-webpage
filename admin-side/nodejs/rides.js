/**
 * Active Rides Monitoring Module
 */

import { apiGet } from './api.js';
import { openRideModal, closeRideModal, truncateText, formatDate } from './ui-helpers.js';

/**
 * Load all active rides
 */
async function loadRides() {
    try {
        const rides = await apiGet("/rides/active");

        const list = document.getElementById("rideList");

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
                    <button class="view-ride-btn" onclick="window.ridesModule.viewRideDetails('${ride.rideId}')">
                        View Details
                    </button>
                </div>
            </div>
        `).join('');

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

/**
 * Load driver name for a ride
 */
async function loadDriverName(driverId, rideId) {
    try {
        const driver = await apiGet(`/users/${driverId}`);
        const element = document.getElementById(`driver-${rideId}`);
        if (element) {
            element.textContent = driver.name;
        }
    } catch (err) {
        console.error("Error loading driver name:", err);
        const element = document.getElementById(`driver-${rideId}`);
        if (element) {
            element.textContent = driverId;
        }
    }
}

/**
 * View detailed ride information
 */
async function viewRideDetails(rideId) {
    try {
        const ridesResponse = await apiGet("/rides/active");
        const ride = ridesResponse.find(r => r.rideId === rideId);

        if (!ride) throw new Error("Ride not found");

        let driver = null;
        try {
            driver = await apiGet(`/users/${ride.driverId}`);
        } catch (err) {
            console.error("Error loading driver:", err);
        }

        let vehicle = null;
        try {
            const vehicles = await apiGet("/vehicles");
            vehicle = vehicles.find(v => v.carId === ride.carId);
        } catch (err) {
            console.error("Error loading vehicle:", err);
        }

        populateRideModal(ride, driver, vehicle);
        openRideModal();

    } catch (err) {
        console.error("Error viewing ride details:", err);
        alert("Failed to load ride details. Please try again.");
    }
}

/**
 * Populate ride modal with data
 */
async function populateRideModal(ride, driver, vehicle) {
    document.getElementById("modalRideTitle").textContent = `Ride ${ride.rideId}`;
    document.getElementById("modalRideSubtitle").textContent = `Status: ${ride.status}`;

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

    document.getElementById("detailDate").textContent = ride.date || 'N/A';
    document.getElementById("detailDepartureTime").textContent = ride.departureTime || 'N/A';
    document.getElementById("detailStationedAt").textContent = ride.stationedAt || 'N/A';
    document.getElementById("detailDestination").textContent = ride.destination || 'N/A';
    document.getElementById("detailAvailableSeats").textContent =
        `${ride.availableSeats} / ${ride.availableSeats + (ride.bookedSeats || 0)} total`;
    document.getElementById("detailPrice").textContent = `₱${ride.price || 0}`;

    await populatePassengersList(ride);
}

/**
 * Populate passengers list in modal
 */
async function populatePassengersList(ride) {
    const passengersList = document.getElementById("passengersList");

    if (!ride.passengers || ride.passengers.length === 0) {
        passengersList.innerHTML = `
            <div class="no-passengers">
                No passengers booked yet
            </div>
        `;
        return;
    }

    const passengerPromises = ride.passengers.map(async (passenger) => {
        try {
            const user = await apiGet(`/users/${passenger.userId}`);
            return {
                ...passenger,
                name: user.name,
                occupation: user.occupation,
                userID: user.userID
            };
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

export { loadRides, viewRideDetails, closeRideModal };
