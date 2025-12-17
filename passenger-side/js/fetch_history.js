const BASE = '/9467_it312-teamarc_midtermproject';

document.addEventListener("DOMContentLoaded", () => {
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

        // Upcoming rides
        if (data.upcoming?.length) {
            data.upcoming.forEach(ride =>
                upcomingContainer.appendChild(createRideCard(ride, false))
            );
        } else {
            upcomingContainer.innerHTML = `<p>No upcoming rides.</p>`;
        }

        // Finished rides
        if (data.finished?.length) {
            data.finished.forEach(ride =>
                finishedContainer.appendChild(createRideCard(ride, true))
            );
        } else {
            finishedContainer.innerHTML = `<p>No finished rides.</p>`;
        }
    }

    function createRideCard(ride, isFinished = false) {
        console.log('Ride status:', ride.status, ride);

        // Stores the cancelled status. Will be used later on
        const isCancelled =
        Array.isArray(ride.status)
        ? ride.status.includes('cancelled')
        : ride.status === 'cancelled';

        const card = document.createElement('div');
        card.classList.add('ride-card');

        const carIcon = "../images/car.png";
        const clockIcon = "../images/clock-icon.png";
        const reportIcon = "../images/report.png";
        const starIcon = "../images/star-gray.png";

        const driverId = ride.driverId || 'UNKNOWN';
        const rideId = ride.rideId || '';
        const driverName = ride.name || 'Unknown Driver';
        const bookingId = ride.bookingId || '';

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

            ${!isFinished ? `
                <button class="cancel-btn"
                    data-bookingid="${bookingId}"
                    data-rideid="${rideId}">
                    Cancel Booking
                </button>
            ` : ''}

            ${isFinished ? `
                <div class="card-actions">
                    <button class="rate-btn"
                        onclick="openRateModal('${rideId}', '${driverId}', '${driverName}')">
                        <img src="${starIcon}" />
                        <span>Rate</span>
                    </button>

                    <button class="report-btn"
                        onclick="openComplaintModal('${rideId}', '${driverId}', '${driverName}')">
                        <img src="${reportIcon}" />
                        <span>Report</span>
                    </button>
                </div>
            ` : ''}
        `;
        
        if (isCancelled) {
            card.classList.add('cancelled');
            const badge = document.createElement('div');
            badge.className = 'cancelled-badge';
            badge.textContent = 'Cancelled';
            card.appendChild(badge);
            
            // Remove rate / report buttons
            card.querySelector('.card-actions')?.remove();
        }
        return card;
    }
});

/* CANCEL BOOKING */
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.cancel-btn');
    if (!btn) return;

    const bookingId = btn.dataset.bookingid;
    const rideId = btn.dataset.rideid;

    if (!bookingId || !rideId) {
        alert('Invalid booking data.');
        return;
    }

    const modal = document.getElementById('cancelModal');
    modal.classList.add('open');
    
    document.getElementById('cancelNoBtn').onclick = () => {
        modal.classList.remove('open');
    };
    
    document.getElementById('cancelYesBtn').onclick = async () => {
        modal.classList.remove('open');
        
        try {
            const res = await fetch(`${BASE}/passenger-side/includes/cancel_booking.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ bookingId, rideId })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            
            location.reload();
        
        } catch (err) {
            alert('Server error');
        }
    };
});

/* RATING */
window.openRateModal = function (rideId, driverId, driverName) {
    const modal = document.getElementById('rateModal');
    if (!modal) return alert('Rate dialog not available');

    document.getElementById('rateDriverName').textContent = driverName || 'Driver';
    modal.dataset.rideId = rideId;
    modal.dataset.driverId = driverId || '';
    modal.classList.add('open');

    modal.querySelectorAll('.star').forEach(s => s.classList.remove('selected'));
};

window.closeRateModal = function () {
    document.getElementById('rateModal')?.classList.remove('open');
};

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('star')) {
        const value = Number(e.target.dataset.value);
        const stars = e.target.closest('.stars')?.querySelectorAll('.star') || [];
        stars.forEach(s =>
            s.classList.toggle('selected', Number(s.dataset.value) <= value)
        );
    }

    if (e.target.id === 'saveRatingBtn') {
        const modal = document.getElementById('rateModal');
        const rating = modal.querySelectorAll('.star.selected').length;
        if (!rating) { alert('Please select a rating.'); return; }

        const rideId = modal.dataset.rideId || '';
        const driverId = modal.dataset.driverId || '';
        if (!rideId || !driverId) { alert('Missing ride or driver information.'); return; }

        fetch(`${BASE}/passenger-side/includes/submit_review.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ rideId, driverId, rating })
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok || data.error) {
                throw new Error(data.error || 'Failed to save review');
            }
            closeRateModal();
            alert(`Thanks! Your rating was saved. Current average: ${data.ratingAvg ?? 'N/A'}`);
        })
        .catch(err => {
            console.error(err);
            alert('Could not save your rating.');
        });
    }
});
