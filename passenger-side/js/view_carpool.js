import { getCookie } from "../../js/frontend-utils.js";

document.addEventListener("DOMContentLoaded", () => {
    const BASE = '/9467_it312-teamarc_midtermproject';

    // Debug logs
    console.log("Document cookie:", document.cookie);
    console.log("getCookie function:", getCookie);
    console.log("Cookie last_viewed_ride:", getCookie("last_viewed_ride"));

    // Helper: resolve image paths safely
    function resolveImagePath(path, fallback) {
        if (!path) return `${BASE}/${fallback}`;
        return `${BASE}/${path}`;
    }

    // Get rideId from URL while falling back to cookie
    const urlParams = new URLSearchParams(window.location.search);
    const rideId = urlParams.get("rideId") || getCookie("last_viewed_ride");

    // Error handling
    if (!rideId) {
        alert('No ride selected!');
        window.location.href = 'list-of-carpools.html';
        return;
    }

    // Fetch ride details
    fetch(`${BASE}/passenger-side/includes/view_carpool.php?rideId=${rideId}`, {
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ride not found');
            }
            return response.json();
        })
        .then(ride => {
            console.log('Ride details:', ride);

            // DRIVER PHOTO
            document.querySelector('.driver-photo').src = resolveImagePath(
                ride.driverPhoto,
                'storage/uploads/profile/default-user.png'
            );

            // DRIVER NAME
            document.querySelector('.driver-name').textContent = ride.driverName;

            // DRIVER INFO
            document.querySelector('.info-item:nth-child(1) p').innerHTML =
                `<strong>Available Seats:</strong> ${ride.availableSeats}`;

            document.querySelector('.info-item:nth-child(2) p').innerHTML =
                `<strong>Cost per seat:</strong> ₱${ride.price.toFixed(2)}`;

            document.querySelector('.info-item:nth-child(3) p').innerHTML =
                `<strong>Departure time:</strong> ${ride.departureTime}`;

            // CAR PHOTO
            document.querySelector('.car-photo').src = resolveImagePath(
                ride.carPhoto,
                'storage/uploads/car/default-car.png'
            );

            // RIDE DETAILS
            document.querySelector('.ride-details').innerHTML = `
                <p><strong>Stationed at:</strong> ${ride.stationedAt}</p>
                <p><strong>To:</strong> ${ride.destination}</p>
                <p><strong>Plate Number:</strong> ${ride.plateNo}</p>
                <p><strong>Car Model:</strong> ${ride.carMake} ${ride.carModel}</p>
                <p><strong>Driver's Rating:</strong> ${
                    ride.driverRating === 'N/A'
                        ? 'No ratings yet'
                        : ride.driverRating + ' ⭐'
                }</p>
            `;

            // Store rideId for booking
            document.getElementById('bookBtn')
                .setAttribute('data-rideid', ride.rideId);

            // VIEW DRIVER PROFILE BUTTON
            document.getElementById('viewDriverBtn')
                .addEventListener('click', () => {
                    window.location.href =
                        `viewprofile.html?driverId=${encodeURIComponent(ride.driverId)}`;
                });
        })
        .catch(error => {
            console.error('Error loading ride details:', error);
            alert('Failed to load ride details. Redirecting back...');
            window.location.href = 'list-of-carpools.html';
        });

    // Book button handler (future)
    document.getElementById('bookBtn').addEventListener('click', () => {
        const rideId = document.getElementById('bookBtn').dataset.rideid;
        console.log('Booking ride:', rideId);
    });

    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', () => {
        window.location.href = 'list-of-carpools.html';
    });
});

// Future use
function getRideIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('rideId');
}
