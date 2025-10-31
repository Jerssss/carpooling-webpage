// TO BE USED FOR CONNECTING PHP FILE WITH HTML FILE

document.addEventListener("DOMContentLoaded", () => {
    // This variable gets the element ID which the dynamic content will be inserted in
    const container = document.querySelector('.carpool-container'); // Gets class from the HTML file
    
    // Fetch carpool data from PHP
    fetch('includes/fetch_carpool.php')
    .then(response => response.json())
    .then(data => {
      container.innerHTML = ''; // clear old cards

      data.forEach(carpool => {
        const card = document.createElement('div');
        card.classList.add('carpool-card');

        card.innerHTML = `
          <img src="${carpool.photo}" alt="${carpool.name}">
          <div class="carpool-info">
            <h3>${carpool.name}</h3>
            <p class="vehicle">${carpool.vehicle}</p>
            <p class="role">${carpool.role}</p>
            <p>Available seats: ${carpool.availableSeats}</p>
            <p>Leaving at: ${carpool.leavingTime}</p>
          </div>
          <div class="card-footer">
            <span class="status-dot ${carpool.status.toLowerCase() === 'active' ? 'green' : 'red'}"></span>
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