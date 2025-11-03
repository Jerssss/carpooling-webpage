document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const driverId = urlParams.get("driverId");

  if (!driverId) {
    document.getElementById("driverProfile").innerHTML =
      "<p>No driver ID provided.</p>";
    return;
  }

  try {
    const response = await fetch(`includes/fetch_driver.php?driverId=${driverId}`);
    const data = await response.json();

    if (data.error) {
      document.getElementById("driverProfile").innerHTML = `<p>${data.error}</p>`;
      return;
    }

    const driver = data.driver_info || {};
    const vehicles = data.vehicles || [];
    const rides = data.rides || [];
    const reviews = data.reviews || [];

    let html = `
      <div class="profile-container">
        <div class="profile-header">
          <div class="user-basic">
            <img src="${driver.picture || 'images/default-driver.png'}" class="profile-photo" alt="Driver Photo">
            <div>
              <h2>${driver.name || "Unnamed Driver"}</h2>
              <p>${driver.email || "No email provided"}</p>
              <div class="rating">${"★".repeat(driver.rating || 0)}</div>
            </div>
          </div>
        </div>

        <div class="profile-details">
          <div class="detail-group">
            <label>Phone</label>
            <p>${driver.phoneNo || "N/A"}</p>
          </div>
          <div class="detail-group">
            <label>Occupation</label>
            <p>${driver.occupation || "N/A"}</p>
          </div>
          <div class="detail-group">
            <label>Verified</label>
            <p>${driver.isVerified ? "Yes" : "No"}</p>
          </div>
        </div>

        <div class="profile-section">
          <h3>Vehicle(s)</h3>
          ${
            vehicles.length
              ? "<ul>" +
                vehicles.map(
                    v => `<li>${v.carMake || "Unknown"} ${v.carModel || ""} (${v.plateNo || "No Plate"})</li>`
                  ).join("") +
                "</ul>"
              : "<p>No registered vehicles.</p>"
          }

          <h3>Rides Offered</h3>
          ${
            rides.length
              ? "<ul>" +
                rides.map(
                    r => `<li>From ${r.stationedAt || "?"} to ${r.destination || "?"} on ${r.date || "?"}</li>`
                  ).join("") +
                "</ul>"
              : "<p>No rides found.</p>"
          }

          <h3>Reviews</h3>
          ${
            reviews.length
              ? "<ul>" +
                reviews.map(
                    rev => `<li>"${rev.comment || "No comment"}" - ${rev.passengerName || "Anonymous"}</li>`
                  ).join("") +
                "</ul>"
              : "<p>No reviews yet.</p>"
          }
        </div>
      </div>
    `;

    document.getElementById("driverProfile").innerHTML = html;
  } catch (err) {
    console.error("Error fetching driver profile:", err);
    document.getElementById("driverProfile").innerHTML =
      "<p>Error loading profile data.</p>";
  }
});
