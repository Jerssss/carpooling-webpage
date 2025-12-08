document.addEventListener("DOMContentLoaded", () => {
    const BASE = '/9467_it312-teamarc_midtermproject';
    // Get rideId from URL 
    const urlParams = new URLSearchParams(window.location.search);
    const rideId = urlParams.get('rideId');

    // Error handling
    if (!rideId) {
        alert('No ride selected!');
        window.location.href = 'list-of-carpools.html';
        return;
    }

    // Fetch ride details
    fetch(`${BASE}/passenger-side/includes/view_carpool.php?rideId=${rideId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Ride not found');
            }
            return response.json();
        })
        .then(ride => {
            console.log('Ride details:', ride);
            
            // Update driver photo
            const driverPhoto = (ride.driverPhoto || '../images/profile_pics/default-pic.png').replace(/^\.\.\//, `${BASE}/`);
            document.querySelector('.driver-photo').src = driverPhoto;
            // document.querySelector('.driver-photo').alt = ride.driverName || '../images/profile_pics/default-pic.png';
            
            // Update driver name
            document.querySelector('.driver-name').textContent = ride.driverName;
            
            // Update driver info
            document.querySelector('.info-item:nth-child(1) p').innerHTML = 
                `<strong>Available Seats:</strong> ${ride.availableSeats}`;
            
            document.querySelector('.info-item:nth-child(2) p').innerHTML = 
                `<strong>Cost per seat:</strong> ₱${ride.price.toFixed(2)}`;
            
            document.querySelector('.info-item:nth-child(3) p').innerHTML = 
                `<strong>Departure time:</strong> ${ride.departureTime}`;
            
            // Update car photo
            const carPhoto = (ride.carPhoto || '../images/car_pics/default_car.png').replace(/^\.\.\//, `${BASE}/`);
            document.querySelector('.car-photo').src = carPhoto;
            // document.querySelector('.car-photo').alt = `${ride.carMake} ${ride.carModel}` || '../images/car_pics/default_car.png';
            
            // Update ride details
            document.querySelector('.ride-details').innerHTML = `
                <p><strong>Stationed at:</strong> ${ride.stationedAt}</p>
                <p><strong>To:</strong> ${ride.destination}</p>
                <p><strong>Plate Number:</strong> ${ride.plateNo}</p>
                <p><strong>Car Model:</strong> ${ride.carMake} ${ride.carModel}</p>
                <p><strong>Driver's Rating:</strong> ${ride.driverRating === 'N/A' ? 'No ratings yet' : ride.driverRating + ' ⭐'}</p>
            `;
            
            // Store rideId for booking
            document.getElementById('bookBtn').setAttribute('data-rideid', ride.rideId);
        })
        .catch(error => { // Error handling
            console.error('Error loading ride details:', error);
            alert('Failed to load ride details. Redirecting back...');
            window.location.href = 'list-of-carpools.html';
        });

    // Book button handler (TO BE DONE LATER)
    document.getElementById('bookBtn').addEventListener('click', () => {
        const rideId = document.getElementById('bookBtn').getAttribute('data-rideid');
    });

    // Cancel button handler
    document.getElementById('cancelBtn').addEventListener('click', () => {
        window.location.href = 'list-of-carpools.html';
    });
});

// Gets ride ID and passes it to payment
function getRideIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('rideId');
}