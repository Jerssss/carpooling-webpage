document.addEventListener("DOMContentLoaded", () => {
    const BASE = '/9467_it312-teamarc_midtermproject';
    const upcomingContainer = document.getElementById("upcomingRidesContainer");
    const finishedContainer = document.getElementById("finishedRidesContainer");

    if (!upcomingContainer || !finishedContainer) {
        console.error("Ride containers not found in DOM");
        return;
    }

    fetch(`${BASE}/passenger-side/includes/fetch_history.php`, { credentials: 'include' })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse JSON:", text);
                return;
            }

            renderRides(data);
        })
        .catch(error => {
            console.error("Error fetching ride history:", error);
            upcomingContainer.innerHTML = `<p class="error-msg">Failed to load upcoming rides.</p>`;
            finishedContainer.innerHTML = `<p class="error-msg">Failed to load finished rides.</p>`;
        });

    function renderRides(data) {
        upcomingContainer.innerHTML = '';
        finishedContainer.innerHTML = '';

        // Upcoming rides - no report button
        if (data.upcoming && data.upcoming.length > 0) {
            data.upcoming.forEach(ride => upcomingContainer.appendChild(createRideCard(ride, false)));
        } else {
            upcomingContainer.innerHTML = `<p>No upcoming rides.</p>`;
        }

        // Finished rides - with report button
        if (data.finished && data.finished.length > 0) {
            data.finished.forEach(ride => finishedContainer.appendChild(createRideCard(ride, true)));
        } else {
            finishedContainer.innerHTML = `<p>No finished rides.</p>`;
        }
    }

    function createRideCard(ride, showReportButton = false) {
        const card = document.createElement('div');
        card.classList.add('ride-card');

        // Fix image paths
        const carIcon = "../images/car.png";
        const clockIcon = "../images/clock-icon.png";
        const reportIcon = "../images/report.png"; 

        // Get driver ID from ride data
        const driverId = ride.userId || 'UNKNOWN';
        const rideId = ride.rideId || '';
        const driverName = ride.name || 'Unknown Driver';

        card.innerHTML = `
            <div class="ride-header">
                <div class="ride-left">
                    <div class="ride-icon"><img src="${carIcon}" /></div>
                    <div class="ride-info">
                        <h2>${driverName}</h2>
                        <p><img class="user-icon" src="${clockIcon}" /> ${ride.departureTime}</p>
                    </div>
                </div>
            </div>

            <div class="ride-route">
                <div class="route-details">
                    <div>
                        <span class="label">Pickup</span>
                        <p class="place">${ride.pickupLocation || ride.stationedAt}</p>
                    </div>
                    <div>
                        <span class="label">Dropoff</span>
                        <p class="place">${ride.destination}</p>
                    </div>
                    <div>
                        <span class="label">Fare</span>
                        <p class="place">₱${ride.price}</p>
                    </div>
                </div>
            </div>
            
            ${showReportButton ? `
                <button class="report-btn" onclick="openComplaintModal('${rideId}', '${driverId}', '${driverName}')" title="Report this driver">
                    <img src="${reportIcon}" alt="Report" />
                    <span>Report</span>
                </button>
            ` : ''}
        `;
        return card;
    }
});