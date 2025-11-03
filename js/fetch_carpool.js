// TO BE USED FOR CONNECTING PHP FILE WITH HTML FILE
document.addEventListener("DOMContentLoaded", () => {
    // This variable gets the element ID which the dynamic content will be inserted in
    const container = document.querySelector('.carpool-container'); // Gets class from the HTML file
    
    // Fetch carpool data from PHP
    fetch('includes/fetch_carpool.php')
    .then(response => response.json())
    .then(data => {

      console.log(data)
      container.innerHTML = ''; // Clear old cards

      data.forEach(carpool => {
        console.log('Ride ID : ', carpool.rideId) // Debug
        const card = document.createElement('div'); // Creates dynamic divs that contains the carpool cars
        card.classList.add('carpool-card');

        // Generate dynamic cards
        card.innerHTML = `
          <img src="${carpool.photo}" alt="${carpool.name}">
          <div class="carpool-info">
            <h3>${carpool.name}</h3>
            <p class="occupation"><strong>${carpool.occupation}</strong></p>
            <p class="stationedAt"><strong>Stationed at: </strong> ${carpool.stationedAt}</p>
            <p class="destination"><strong>Destination:</strong> ${carpool.destination}</p>
            <p><strong>Available seats: </strong>${carpool.availableSeats}</p>
            <p><strong>Leaving at:</strong> ${carpool.leavingTime}</p>
            <p><strong>For:</strong> ${carpool.for}</p>
          </div>
          <div class="card-footer">
            <span class="status-dot ${carpool.status.toLowerCase() === 'available' ? 'green' : 'red'}"></span>
            <button class="view-btn" data-rideid="${carpool.rideId}">View</button>
          </div>
        `;

        container.appendChild(card);
      });

        // Add click event listener to View button
        document.querySelectorAll('.view-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const rideId = e.target.getAttribute('data-rideid'); // Get the ride ID of the clicked car pool
            console.log(rideId) // Debug to check if ride id is obtained from query
            window.location.href = `driverdetails.html?rideId=${rideId}`;
        });
      });
    })
    .catch(error => {
      console.error('Error loading carpools:', error);
      container.innerHTML = '<p>Failed to load carpools.</p>';
    });
});