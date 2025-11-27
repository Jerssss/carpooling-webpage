// Toast notification
function showNotification(message, color = "#28a745") {
  const notif = document.getElementById("notification");
  notif.style.backgroundColor = color;
  notif.innerText = message;
  notif.style.display = "block";
  setTimeout(() => notif.style.display = "none", 3000);
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("rideHistoryContainer");
  const modal = document.getElementById("reportModal");
  const closeModal = document.getElementById("closeReportModal");
  const submitReport = document.getElementById("submitReport");
  const cancelReport = document.getElementById("cancelReport");
  const reportText = document.getElementById("reportText");

  let selectedHistoryId = null;

  try {
    const res = await fetch("includes/fetch_history.php");
    const rides = await res.json();

    if (!rides || rides.length === 0) {
      container.innerHTML = "<p>No rides found.</p>";
      return;
    }

    rides.forEach(ride => {
      const rideCard = document.createElement("div");
      rideCard.classList.add("ride-card");

      let starsHTML = "";
      for (let i = 1; i <= 5; i++) {
        const selected = i <= (ride.rating || 0) ? "selected" : "";
        starsHTML += `<span class="star ${selected}" data-value="${i}" data-historyid="${ride.historyId}">&#9733;</span>`;
      }

      rideCard.innerHTML = `
        <div class="ride-header">
          <div class="ride-left">
            <div class="ride-icon">
              <img src="../images/car.png">
            </div>
            <div class="ride-info">
              <h2>${ride.carModel}</h2>
              <p><img src="../images/person-icon.png" class="user-icon"> ${ride.name}</p>
            </div>
          </div>
        </div>

        <div class="ride-route">
          <div class="route-line">
            <div class="dot"></div>
            <div class="line"></div>
            <div class="dot"></div>
          </div>
          <div class="route-details">
            <div class="pickup">
              <p class="label">PICKUP</p>
              <p class="place">${ride.pickup}</p>
            </div>
            <div class="dropoff">
              <p class="label">DROPOFF</p>
              <p class="place">${ride.dropoff}</p>
            </div>
          </div>
        </div>

        <div class="ride-footer">
          <div class="info-box">
            <div class="icon"><img src="../images/calendar-icon.png"></div>
            <p class="label">Date</p>
            <p class="value">${ride.date}</p>
          </div>

          <div class="info-box">
            <div class="icon"><img src="../images/clock-icon.png"></div>
            <p class="label">Time</p>
            <p class="value">${ride.time}</p>
          </div>

          <div class="info-box">
            <div class="icon"><img src="../images/distance-icon.png"></div>
            <p class="label">Distance</p>
            <p class="value">${ride.distance} km</p>
          </div>

          <div class="info-box">
            <div class="icon"><img src="../images/fare.png"></div>
            <p class="label">Fare</p>
            <p class="value">₱${ride.fare}</p>
          </div>
        </div>

        <div class="ride-actions">
          <div class="rating">${starsHTML}</div>
          <div class="report-btn action-btn">
            <img src="../images/report-gray.png">
          </div>
        </div>
      `;

      container.appendChild(rideCard);
    });

    // STAR CLICK
    container.addEventListener("click", async (e) => {
      if (!e.target.classList.contains("star")) return;

      const star = e.target;
      const value = parseInt(star.dataset.value);
      const historyId = star.dataset.historyid;
      const stars = star.parentNode.querySelectorAll(".star");

      stars.forEach(s => s.classList.toggle("selected", parseInt(s.dataset.value) <= value));

      await fetch("includes/fetch_history.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId, rating: value })
      });

      showNotification(`You rated this ride ${value} star${value === 1 ? "" : "s"}`);
    });

    // STAR HOVER
    container.addEventListener("mouseover", e => {
      if (!e.target.classList.contains("star")) return;
      const star = e.target;
      const value = parseInt(star.dataset.value);
      const stars = star.parentNode.querySelectorAll(".star");
      stars.forEach(s => s.classList.toggle("hovered", parseInt(s.dataset.value) <= value));
    });

    container.addEventListener("mouseout", e => {
      if (!e.target.classList.contains("star")) return;
      const stars = e.target.parentNode.querySelectorAll(".star");
      stars.forEach(s => s.classList.remove("hovered"));
    });

    // REPORT BUTTON
    container.addEventListener("click", (e) => {
      const reportBtn = e.target.closest(".report-btn");
      if (!reportBtn) return;

      const card = reportBtn.closest(".ride-card");
      selectedHistoryId = card.querySelector(".star").dataset.historyid;

      reportText.value = "";
      modal.style.display = "flex";
    });

    closeModal.onclick = () => modal.style.display = "none";
    cancelReport.onclick = () => modal.style.display = "none";

    window.onclick = (e) => {
      if (e.target === modal) modal.style.display = "none";
    };

    submitReport.onclick = async () => {
      const description = reportText.value.trim();
      if (!description) return alert("Please enter a description.");

      try {
        const res = await fetch("includes/fetch_history.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historyId: selectedHistoryId, report_description: description })
        });

        const result = await res.json();

        if (result.success) {
          showNotification("Your report has been submitted.");
          modal.style.display = "none";
        } else {
          showNotification("Failed to submit report.", "#dc3545");
        }

      } catch (err) {
        console.error(err);
        showNotification("Error submitting report.", "#dc3545");
      }
    };

  } catch (err) {
    console.error("Error loading rides:", err);
    container.innerHTML = "<p>Failed to load ride history.</p>";
  }
});
