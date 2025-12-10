import { getCookie } from "../../js/frontend-utils.js";

// Restore last search filters
document.addEventListener("DOMContentLoaded", () => {
    const search = getCookie("last_search");
    const seat   = getCookie("last_seat");
    const type   = getCookie("last_for");

    if (search) document.getElementById("searchInput").value = decodeURIComponent(search);
    if (seat)   document.getElementById("seatSelect").value = seat;
    if (type)   document.getElementById("forSelect").value = type;

    fetchCarpools(); // normal AJAX fetch
});

// Main functionality
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".carpool-container");
  const BASE = '/9467_it312-teamarc_midtermproject';
    const searchInput = document.getElementById("searchInput");
    const forFilter = document.getElementById("forFilter");
    const seatFilter = document.getElementById("seatsFilter");
    const roleFilter = document.getElementById("roleFilter");

    console.log('Fetching carpools with:', {
      search: searchInput.value,
      for: forFilter.value,
      seat: seatFilter.value,
      role: roleFilter.value
    });

  
    async function fetchCarpools() {
      const params = new URLSearchParams({
        search: searchInput.value.trim(),
        for: forFilter.value,
        seat: seatFilter.value,
        role: roleFilter.value
      });
  
      try {
        const response = await fetch(`${BASE}/passenger-side/includes/fetch_carpool.php?${params.toString()}`, {
            credentials: 'same-origin'
        });
        const data = await response.json();
        renderCarpools(data);
      } catch (error) {
        console.error("Error fetching carpools:", error);
      }
    }
  
    function renderCarpools(carpools) {
      container.innerHTML = "";
      if (!Array.isArray(carpools) || carpools.length === 0) {
        container.innerHTML = "<p>No matching carpools found.</p>";
        return;
      }

      carpools.forEach((carpool) => {
        const card = document.createElement("div");
        card.classList.add("carpool-card");
        const photoUrl = (carpool.photo || '../images/profile_pics/default-pic.png').replace(/^\.^\.^\//, `${BASE}/`);
        const statusClass = (carpool.status || '').toLowerCase() === 'available' ? 'green' : 'red';
        card.innerHTML = `
          <img src="${photoUrl}" alt="${carpool.name || 'Driver Photo'}">
          <div class="carpool-info">
            <h3>${carpool.name || 'Unnamed Driver'}</h3>
            <p class="occupation"><strong>${carpool.occupation || 'N/A'}</strong></p>
            <p>
              <button class="loc-icon-btn" title="View on map" aria-label="View stationed location on map" data-address="${(carpool.stationedAt || '').replace(/"/g,'&quot;')}" data-label="Stationed at">
                <img src="${BASE}/images/stationed.png" alt="Stationed At">
              </button>
              ${carpool.stationedAt || 'N/A'}
            </p>
            <p>
              <button class="loc-icon-btn" title="View on map" aria-label="View destination on map" data-address="${(carpool.destination || '').replace(/"/g,'&quot;')}" data-label="Destination">
                <img src="${BASE}/images/destination.png" alt="Destination">
              </button>
              ${carpool.destination || 'N/A'}
            </p>
            <p><img src="${BASE}/images/car-seat.png" alt="Seats"> ${carpool.availableSeats ?? 'N/A'} seats</p>
            <p><img src="${BASE}/images/clock-icon.png" alt="Time"> ${carpool.leavingTime || 'N/A'}</p>
            <p><img src="${BASE}/images/pickup.png" alt="For"> ${carpool.for || 'N/A'}</p>
          </div>
          <div class="card-footer">
            <span class="status-dot ${statusClass}"></span>
            <button class="view-btn" data-rideid="${carpool.rideId || ''}">View</button>
          </div>
        `;
        container.appendChild(card);
      });

      // Attach click handlers for the newly rendered View buttons
      container.querySelectorAll('.view-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const rideId = e.currentTarget.getAttribute('data-rideid');
          if (!rideId) return;
          // Keep the same navigation as the previous renderer
          window.location.href = `driverdetails.html?rideId=${rideId}`;
        });
      });

      // Attach click handlers for map icon buttons
      container.querySelectorAll('.loc-icon-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const address = e.currentTarget.getAttribute('data-address');
          const label = e.currentTarget.getAttribute('data-label') || 'Location';
          if (address && typeof window.showLocationOnMap === 'function') {
            window.showLocationOnMap(address, label);
          }
        });
      });
    }
  
    [searchInput, forFilter, seatFilter, roleFilter].forEach((el) => {
      el.addEventListener("input", fetchCarpools);
      el.addEventListener("change", fetchCarpools);
    });
  
    fetchCarpools();
  });