document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector('.carpool-container');

    const BASE = '/9467_it312-teamarc_midtermproject';
    const endpoint = `${BASE}/passenger-side/includes/fetch_carpool.php`;

    fetch(endpoint)
    .then(response => response.json())
    .then(data => {
      container.innerHTML = '';

      data.forEach(carpool => {
        const card = document.createElement('div');
        card.classList.add('carpool-card');

        const photoUrl = (carpool.photo || '../images/profile_pics/default-pic.png').replace(/^\.\.\//, `${BASE}/`);

        card.innerHTML = `
        <img src="${photoUrl}" alt="${carpool.name || 'Driver Photo'}">
        <div class="carpool-info">
          <h3>${carpool.name || 'Unnamed Driver'}</h3>
          <p class="occupation"><strong>${carpool.occupation || 'N/A'}</strong></p>
          <p><img src="${BASE}/images/stationed.png" alt="Stationed At"> ${carpool.stationedAt || 'N/A'}</p>
          <p><img src="${BASE}/images/destination.png" alt="Destination"> ${carpool.destination || 'N/A'}</p>
          <p><img src="${BASE}/images/car-seat.png" alt="Seats"> ${carpool.availableSeats ?? 'N/A'} seats</p>
          <p><img src="${BASE}/images/clock-icon.png" alt="Time"> ${carpool.leavingTime || 'N/A'}</p>
          <p><img src="${BASE}/images/pickup.png" alt="For"> ${carpool.for || 'N/A'}</p>
        </div>
        <div class="card-footer">
          <span class="status-dot ${(carpool.status || '').toLowerCase() === 'available' ? 'green' : 'red'}"></span>
          <button class="view-btn" data-rideid="${carpool.rideId || ''}">View</button>
        </div>
        `;
        container.appendChild(card);
      });

      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const rideId = e.target.getAttribute('data-rideid');
          window.location.href = `driverdetails.html?rideId=${rideId}`;
        });
      });
    })
    .catch(error => {
      console.error('Error loading carpools:', error);
      container.innerHTML = '<p>Failed to load carpools.</p>';
    });
});
