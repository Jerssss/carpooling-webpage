// payment-gateway.js

document.addEventListener("DOMContentLoaded", () => {
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
  const idNumberEl = document.getElementById("idNumber");
  const emailEl = document.getElementById("email");
  const pickupTimeEl = document.getElementById("pickupTime");

  const userId = "U0004"; // later use session variable
  // const rideId = localStorage.getItem("selectedRideId") || "R0001";

  // Function to get query string parameters
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // Get rideId from URL, fallback to default
  const rideId = getQueryParam("rideId") || "R0001";


  // Load user info from DB
  fetch(`includes/get_user_info.php?userId=${userId}&rideId=${rideId}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.user) {
        const u = data.user;
        fullNameEl.value = u.name || "";
        idNumberEl.value = u.idNo || "";
        emailEl.value = u.email || "";
        pickupTimeEl.value = data.departureTime || "";
      }
    })
    .catch((err) => console.error("Error loading user info:", err));

  // === GCash Payment Form ===
  const paymentForm = document.getElementById("paymentForm");
  if (paymentForm) {
    paymentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(paymentForm);

      // Add outside fields
      formData.append("fullName", fullNameEl.value);
      formData.append("idNumber", idNumberEl.value);
      formData.append("email", emailEl.value);
      formData.append("pickupTime", pickupTimeEl.value);
      formData.append("userId", userId);
      formData.append("rideId", rideId);
      formData.append("amount", 50);

      fetch("includes/payment_handler.php", {
        method: "POST",
        body: formData,
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
      formData.append("fullName", fullNameEl.value);
      formData.append("idNumber", idNumberEl.value);
      formData.append("email", emailEl.value);
      formData.append("pickupTime", pickupTimeEl.value);
      formData.append("userId", userId);
      formData.append("rideId", rideId);
      formData.append("amount", 50);

      fetch("includes/payment_handler.php", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert("Cash booking recorded!");
            window.location.href = "receipt.html";
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
