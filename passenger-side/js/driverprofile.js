document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const driverId = urlParams.get("driverId");


  const container = document.getElementById("driverProfile");


  if (!driverId) {
    container.innerHTML = "<p>No driver ID provided.</p>";
    return;
  }


  try {
    const response = await fetch(`../includes/fetch_driver.php?driverId=${driverId}`);
    const data = await response.json();


    if (data.error) {
      container.innerHTML = `<p>${data.error}</p>`;
      return;
    }


    const driver = data.driver_info || {};
    const vehicles = data.vehicles || [];


    // Generate star rating
    const ratingStars = driver.rating
      ? Array.from({ length: 5 }, (_, i) =>
          i < driver.rating ? "&#9733;" : "&#9734;"
        ).join("")
      : "N/A";


    // Vehicle list (concatenated if multiple)
    const vehicleInfo = vehicles.length
      ? vehicles.map(v => `${v.carMake || "Unknown"} ${v.carModel || ""} - ${v.color || "N/A"}`).join(", ")
      : "No registered vehicles";


    const plateInfo = vehicles.length
      ? vehicles.map(v => v.plateNo || "N/A").join(", ")
      : "N/A";


    container.innerHTML = `
      <div class="profile-container">
        <div class="profile-header">
          <div class="user-basic">
            <img src="${driver.picture || '../images/default-driver.png'}" class="profile-photo" alt="Driver Photo">
            <div>
              <h2>${driver.name || "Unnamed Driver"}</h2>
              <p>Driver | ${driver.email || "No email provided"}</p>
              <div class="rating">${ratingStars}</div>
            </div>
          </div>
        </div>


        <div class="profile-details">
          <div class="detail-group">
            <label>Full Name</label>
            <p>${driver.name || "N/A"}</p>
          </div>


          <div class="detail-group">
            <label>Nickname</label>
            <p>${driver.nickname || "N/A"}</p>
          </div>


          <div class="detail-group">
            <label>Contact Number</label>
            <p>${driver.phoneNo || "N/A"}</p>
          </div>


          <div class="detail-group">
            <label>Alternate Number</label>
            <p>${driver.altPhoneNo || "N/A"}</p>
          </div>


          <div class="detail-group">
            <label>Gender</label>
            <p>${driver.gender || "N/A"}</p>
          </div>


          <div class="detail-group">
            <label>Role</label>
            <p>${driver.role || "Driver"}</p>
          </div>


          <div class="detail-group">
            <label>Vehicle</label>
            <p>${vehicleInfo}</p>
          </div>


          <div class="detail-group">
            <label>Plate Number</label>
            <p>${plateInfo}</p>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Error fetching driver profile:", err);
    container.innerHTML = "<p>Error loading profile data.</p>";
  }
});




