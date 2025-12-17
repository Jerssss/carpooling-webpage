function getCookie(name) {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : '';
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".carpool-container");
  const filterSummary = document.getElementById("filterSummary");
  const BASE = '/9467_it312-teamarc_midtermproject';

  // Inputs
  const searchInput = document.getElementById("searchInput");
  const destFilter  = document.getElementById("forFilter");
  const seatFilter  = document.getElementById("seatsFilter");
  const roleFilter  = document.getElementById("roleFilter");
  const dateFilter  = document.getElementById("dateFilter");

  // Restore last search/filters from cookies
  const lastSearch = getCookie("last_search");
  const lastSeat   = getCookie("last_seat");
  const lastType   = getCookie("last_for");
  if (lastSearch) searchInput.value = lastSearch;
  if (lastSeat) seatFilter.value = lastSeat;
  if (lastType) destFilter.value = lastType;

  async function fetchCarpools() {
    const params = new URLSearchParams({
      search: searchInput.value.trim(),
      dest_type: destFilter.value,
      seat: seatFilter.value,
      role: roleFilter.value,
      date: dateFilter?.value || ''
    });

    try {
      const res = await fetch(`${BASE}/passenger-side/includes/fetch_carpool.php?${params}`, { credentials: 'include' });
      const data = await res.json();

      // Debug logging
      console.log('=== DEBUG: Fetch Carpools Response ===');
      console.log('Data:', data);
      console.log('Carpools:', data.carpools);

      if (data.carpools && data.carpools.length > 0) {
        console.log('First carpool:', data.carpools[0]);
        console.log('Is booked?', data.carpools[0].isBooked);
        console.log('Booking status:', data.carpools[0].bookingStatus);
      }

      const carpools = (data.carpools || []).filter(c => Number(c.availableSeats) > 0);
      const seatOptions = data.seatOptions || [];

      updateSeatsDropdown(seatOptions);
      renderCarpools(carpools);
      updateFilterSummary();
    } catch (err) {
      console.error("Error fetching carpools:", err);
      container.innerHTML = "<p>Failed to load carpools.</p>";
    }
  }

  function updateSeatsDropdown(seatOptions) {
    const currentValue = seatFilter.value;
    seatFilter.innerHTML = '<option value="">All Seats</option>';

    seatOptions.sort((a,b) => a-b).forEach(seat => {
      seatFilter.appendChild(new Option(
        `${seat} seat${seat > 1 ? 's' : ''} available`,
        seat
      ));
    });

    if (currentValue && seatOptions.includes(parseInt(currentValue))) {
      seatFilter.value = currentValue;
    } else {
      seatFilter.value = "";
    }
  }

  function renderCarpools(carpools) {
    container.innerHTML = "";
    if (!Array.isArray(carpools) || carpools.length === 0) {
      container.innerHTML = "<p>No matching carpools found.</p>";
      return;
    }

    carpools.forEach(carpool => {

      // Debug per carpool
      console.log(`Rendering carpool ${carpool.rideId}: isBooked=${carpool.isBooked}`);

      const card = document.createElement("div");
      card.classList.add("carpool-card");

      // Add booked class if already booked
      if (carpool.isBooked) {
        card.classList.add("already-booked");
        console.log(`Added 'already-booked' class to ${carpool.rideId}`);
      }

      const photoUrl = carpool.photo
        ? `${BASE}/${carpool.photo}`
        : `${BASE}/storage/uploads/profile/default-user.png`;
      
      const destLabel = carpool.dest_type === 'to_maryheights'
        ? 'To Maryheights Campus'
        : carpool.dest_type === 'from_maryheights'
        ? 'From Maryheights Campus'
        : 'Other Route';

      // Determine the address for the location button
      const locationAddress = carpool.dest_type === 'to_maryheights' ? carpool.stationedAt : carpool.destination;

      card.innerHTML = `
        ${carpool.isBooked ? '<div class="booked-badge">Already Booked</div>' : ''}
        <img src="${photoUrl}" alt="${carpool.name || 'Driver Photo'}">
        <div class="carpool-info">
          <h3>${carpool.name || 'Unnamed Driver'}</h3>
          <p class="occupation"><strong>${carpool.occupation || 'N/A'}</strong></p>
          <p><img src="${BASE}/images/calendar-icon.png"> ${carpool.date || 'N/A'}</p>
          <p><img src="${BASE}/images/clock-icon.png"> ${carpool.leavingTime || 'N/A'}</p>
          <p><img src="${BASE}/images/stationed.png"> ${carpool.stationedAt || 'N/A'}</p>
          <p><img src="${BASE}/images/destination.png"> ${carpool.destination || 'N/A'}</p>
          <p><img src="${BASE}/images/car-seat.png"> ${carpool.availableSeats || 'N/A'} seats</p>
          ${carpool.isBooked ? `<p class="booking-status"><strong>Status:</strong> ${carpool.bookingStatus}</p>` : ''}
        </div>
        <div class="card-footer">
          ${locationAddress ? `
            <button class="loc-btn" 
                    data-address="${locationAddress.replace(/"/g,'&quot;')}" 
                    data-label="Pickup/Drop-off Location" 
                    title="View Location on Map" 
                    aria-label="View Location">
              <img src="${BASE}/images/location.png" alt="View Location"> Location
            </button>` : ''}
            <button class="view-btn"
                    data-rideid="${carpool.rideId}"
                    data-booked="${carpool.isBooked}">
                        ${carpool.isBooked ? 'See History' : 'View'}
            </button>
         </div>
      `;

      container.appendChild(card);
    });

    // Add event listeners for view buttons
    container.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const rideId = e.currentTarget.dataset.rideid;
        const isBooked = e.currentTarget.dataset.booked === "true";
        
        if (isBooked) {
          // Redirect to booking history
          window.location.href = `history.html?rideId=${rideId}`;
          } else {
            // Normal view
            window.location.href = `driverdetails.html?rideId=${rideId}`;
          }
        });
      });

    // Add event listeners for location buttons
    container.querySelectorAll('.loc-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const address = e.currentTarget.dataset.address;
        const label = e.currentTarget.dataset.label;
        if (address) {
          window.showLocationOnMap(address, label);
        } else {
          alert('No location available.');
        }
      });
    });
  }

  function updateFilterSummary() {
    const filters = [];
    if (searchInput.value.trim()) filters.push(`Search: "${searchInput.value.trim()}"`);
    if (destFilter.value) filters.push(`${destFilter.options[destFilter.selectedIndex].text}`);
    if (seatFilter.value) filters.push(`Seats: ${seatFilter.value}`);
    if (roleFilter.value) filters.push(`Role: ${roleFilter.options[roleFilter.selectedIndex].text}`);
    if (dateFilter.value) filters.push(`Date: ${dateFilter.value}`);

    filterSummary.textContent = filters.length ? `Active filters: ${filters.join(' | ')}` : '';
  }

  // Event listeners
  searchInput.addEventListener("input", fetchCarpools);

  const resetBtn = document.getElementById("resetFilterBtn");
  resetBtn.addEventListener("click", () => {
    destFilter.value = "";
    dateFilter.value = "";
    seatFilter.value = "";
    roleFilter.value = "";
  });

  // --- Filter Modal ---
  const openBtn = document.getElementById("openFilterBtn");
  const modal = document.getElementById("filterModal");
  const applyBtn = document.getElementById("applyFilterBtn");
  const cancelBtn = document.getElementById("cancelFilterBtn");

  openBtn.addEventListener("click", () => {
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  });

  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  });

  applyBtn.addEventListener("click", () => {
    // Save current search/filter to cookies
    document.cookie = `last_search=${encodeURIComponent(searchInput.value)}; path=/`;
    document.cookie = `last_seat=${seatFilter.value}; path=/`;
    document.cookie = `last_for=${destFilter.value}; path=/`;

    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    fetchCarpools();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    }
  });

  // Initial load
  fetchCarpools();
});
