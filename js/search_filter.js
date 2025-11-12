document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".carpool-container");
    const searchInput = document.getElementById("searchInput");
    const forFilter = document.getElementById("forFilter");
    const seatFilter = document.getElementById("seatsFilter");
    const roleFilter = document.getElementById("roleFilter");
  
    async function fetchCarpools() {
      const params = new URLSearchParams({
        search: searchInput.value.trim(),
        for: forFilter.value,
        seat: seatFilter.value,
        role: roleFilter.value
      });
  
      try {
        const response = await fetch(`includes/fetch_carpool.php?${params.toString()}`);
        const data = await response.json();
        renderCarpools(data);
      } catch (error) {
        console.error("Error fetching carpools:", error);
      }
    }
  
    function renderCarpools(carpools) {
      container.innerHTML = "";
      if (carpools.length === 0) {
        container.innerHTML = "<p>No matching carpools found.</p>";
        return;
      }
  
      carpools.forEach((carpool) => {
        const card = document.createElement("div");
        card.classList.add("carpool-card");
        card.innerHTML = `
          <img src="${carpool.photo}" alt="Driver Photo">
          <div class="carpool-info">
            <h3>${carpool.name}</h3>
            <p><strong>Occupation:</strong> ${carpool.occupation}</p>
            <p><strong>From:</strong> ${carpool.stationedAt}</p>
            <p><strong>To:</strong> ${carpool.destination}</p>
            <p><strong>Seats:</strong> ${carpool.availableSeats}</p>
            <p><strong>Type:</strong> ${carpool.for}</p>
            <p><strong>Time:</strong> ${carpool.leavingTime}</p>
          </div>
        `;
        container.appendChild(card);
      });
    }
  
    [searchInput, forFilter, seatFilter, roleFilter].forEach((el) => {
      el.addEventListener("input", fetchCarpools);
      el.addEventListener("change", fetchCarpools);
    });
  
    fetchCarpools();
  });