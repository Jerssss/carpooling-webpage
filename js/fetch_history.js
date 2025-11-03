document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("rideHistoryContainer");

  fetch("includes/fetch_history.php")
    .then((response) => response.json())
    .then((data) => {
      console.log("Fetched history data:", data);

      container.innerHTML = "";

      if (!data || data.length === 0) {
        container.innerHTML = "<p>No history records found.</p>";
        return;
      }

      data.forEach((record) => {
        // Map fields exactly as returned by PHP
        const mappedRecord = {
    rideId: record.rideId || "N/A",
    userId: record.passengerId || "Unknown User",
    action: `Pickup: ${record.pickupLocation || "N/A"}`,
    description: `Dropoff: ${record.dropoffLocation || "N/A"} | Fare: ₱${record.fare || 0}`,
    timestamp: `${record.date || ""} ${record.time || ""}`,
    status: record.status || "pending"
};


        const card = document.createElement("div");
        card.classList.add("history-card");

        card.innerHTML = `
          <div class="ride-header ${
            mappedRecord.status === "completed" ? "with-button" : ""
          }">
            <div class="ride-left">
              <div class="ride-icon">
                <img src="assets/icons/car.png" alt="ride icon">
              </div>
              <div class="ride-info">
                <h2>Ride ID: ${mappedRecord.rideId}</h2>
                <p><img src="assets/icons/user.png" class="user-icon"> ${mappedRecord.userId}</p>
              </div>
            </div>
            ${
              mappedRecord.status === "completed"
                ? '<button class="rate-btn">Rate</button>'
                : ""
            }
          </div>

          <div class="ride-route">
            <div class="route-line">
              <div class="dot"></div>
              <div class="line"></div>
              <div class="dot"></div>
            </div>
            <div class="route-details">
              <div>
                <p class="label">Action</p>
                <p class="place">${mappedRecord.action}</p>
              </div>
              <div>
                <p class="label">Description</p>
                <p class="place">${mappedRecord.description}</p>
              </div>
            </div>
          </div>

          <div class="ride-footer">
            <div class="info-box">
              <div class="icon"><img src="assets/icons/calendar.png"></div>
              <p class="label">Timestamp</p>
              <p class="value">${mappedRecord.timestamp}</p>
            </div>
            <div class="info-box">
              <div class="icon"><img src="assets/icons/status.png"></div>
              <p class="label">Status</p>
              <p class="value">${mappedRecord.status}</p>
            </div>
          </div>
        `;

        container.appendChild(card);
      });
    })
    .catch((error) => {
      console.error("Error loading history records:", error);
      container.innerHTML = "<p>Failed to load history records.</p>";
    });
});
