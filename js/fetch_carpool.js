// TO BE USED FOR CONNECTING PHP FILE WITH HTML FILE

document.addEventListener("DOMContentLoaded", () => {
    // This variable gets the element ID which the dynamic content will be inserted in
    const container = document.querySelector('.carpool-container'); // Gets class from the HTML file
    
    // Fetch carpool data from PHP
    fetch('includes/fetch_carpool.php')
    .then(response => response.json())
    .then(data => {
      container.innerHTML = ''; // Clear old cards

      data.forEach(carpool => {
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
            <button class="view-btn"><a href="driverdetails.html?driver=${encodeURIComponent(carpool.name)}">View</a></button>
          </div>
        `;

        container.appendChild(card);
      });
    })
    .catch(error => {
      console.error('Error loading carpools:', error);
      container.innerHTML = '<p>Failed to load carpools.</p>';
    });
});