// Local helper: getCookie (avoid ES module import errors)
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

// Main functionality
document.addEventListener("DOMContentLoaded", () => {
  // Delete payment lock cookie on reload
    document.cookie = "payment_lock=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

  // Prevent multiple submissions
  if (getCookie("payment_lock")) {
      alert("Payment already being processed. Please wait.");
      return;
  }

  const BASE = '/9467_it312-teamarc_midtermproject';
  // === Tab Switching ===
  const gcashTab = document.getElementById("gcash-tab");
  const cashTab = document.getElementById("cash-tab");
  const gcashContent = document.getElementById("gcash-content");
  const cashContent = document.getElementById("cash-content");
  const gcashImage = document.getElementById("gcash-image");
  const cashImage = document.getElementById("cash-image");

  gcashTab.addEventListener("click", () => {
    gcashTab.classList.add("active");
    cashTab.classList.remove("active");
    gcashContent.classList.remove("hidden");
    cashContent.classList.add("hidden");
    gcashImage.classList.remove("hidden");
    cashImage.classList.add("hidden");
  });

  cashTab.addEventListener("click", () => {
    cashTab.classList.add("active");
    gcashTab.classList.remove("active");
    cashContent.classList.remove("hidden");
    gcashContent.classList.add("hidden");
    cashImage.classList.remove("hidden");
    gcashImage.classList.add("hidden");
  });

  // === DB-linked user info fields (outside the form) ===
  const fullNameEl = document.getElementById("fullName");
  const emailEl = document.getElementById("email");
  const pickupTimeEl = document.getElementById("pickupTime");

  // const rideId = localStorage.getItem("selectedRideId") || "R0001";

  // Function to get query string parameters
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // Get rideId from URL, fallback to default
  const rideId = getQueryParam("rideId") || "R0001";


  // Load user info from DB
    fetch(`${BASE}/includes/get_user_info.php?rideId=${rideId}`, {
      credentials: 'include'
    })

    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.user) {
        const u = data.user;
        fullNameEl.value = u.name || "";
        emailEl.value = u.email || "";
        pickupTimeEl.value = data.departureTime || "";
      }
    })
    .catch((err) => console.error("Error loading user info:", err));

    let ridePrice = null;

    fetch(`${BASE}/passenger-side/includes/view_carpool.php?rideId=${rideId}`)
      .then(res => res.json())
      .then(data => {
          ridePrice = data.price ?? 0;
          const priceEl = document.getElementById('ridePrice');
          if (priceEl) priceEl.textContent = `₱ ${ridePrice}`;

          // Only now enable cash/GCash forms
          paymentForm.querySelector('button[type="submit"]').disabled = false;
          cashForm.querySelector('button[type="submit"]').disabled = false;
          console.log("Submitting cash booking with rideId:", rideId, "amount:", ridePrice);
      })
      .catch(err => console.error('Error fetching ride price:', err));


  // === GCash Payment Form ===
  const paymentForm = document.getElementById("paymentForm");
  if (paymentForm) {
    paymentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(paymentForm);

      // Add outside fields
      formData.append("name", fullNameEl.value);
      formData.append("email", emailEl.value);
      formData.append("pickupTime", pickupTimeEl.value);
      formData.append("rideId", rideId);
      formData.append("amount", ridePrice);
      formData.append("method", "GCash");
      // Include coords if chosen via map
      const lat = document.getElementById('gcash-pickup-lat')?.value;
      const lng = document.getElementById('gcash-pickup-lng')?.value;
      if (lat && lng) { formData.append('pickupLat', lat); formData.append('pickupLng', lng); }

      // Debug: log form data keys to verify file presence
      try {
        for (const [k, v] of formData.entries()) {
          console.debug('paymentForm field:', k, (v && v.name) ? `(file: ${v.name})` : v);
        }
      } catch {}

      fetch(`${BASE}/passenger-side/includes/payment_handler.php`, {
        method: "POST",
        body: formData,
        credentials: 'include'
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert("Payment successfully recorded!");
            window.location.href = `receipt.html?rideId=${rideId}`
          } else {
            alert(data.message);
          }
        })
        .catch((err) => {
          console.error("Error submitting payment:", err);
          alert("Error submitting payment.");
        });
    });
  }

  // === Cash Payment Form ===
  const cashForm = document.getElementById("cashForm");
  if (cashForm) {
    cashForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(cashForm);

      // Add outside fields
      formData.append("name", fullNameEl.value);
      formData.append("email", emailEl.value);
      formData.append("pickupTime", pickupTimeEl.value);
      formData.append("rideId", rideId);
      formData.append("amount", ridePrice);
      formData.append("method", "Cash");
      const cashLat = document.getElementById('cash-pickup-lat')?.value;
      const cashLng = document.getElementById('cash-pickup-lng')?.value;
      if (cashLat && cashLng) { formData.append('pickupLat', cashLat); formData.append('pickupLng', cashLng); }

      // Debug: log cash form fields
      try {
        for (const [k, v] of formData.entries()) {
          console.debug('cashForm field:', k, (v && v.name) ? `(file: ${v.name})` : v);
        }
      } catch {}

      fetch(`${BASE}/passenger-side/includes/payment_handler.php`, {
        method: "POST",
        body: formData,
        credentials: 'include'
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert("Cash booking recorded!");
            window.location.href = `receipt.html?rideId=${rideId}`;
          } else {
            alert(data.message);
          }
        })
        .catch((err) => {
          console.error("Error submitting cash booking:", err);
          alert("Error submitting cash booking.");
        });
    });
  }
});
