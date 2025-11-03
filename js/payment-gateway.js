<<<<<<< HEAD
// Tab switch logic
const gcashTab = document.getElementById("gcash-tab");
const cashTab = document.getElementById("cash-tab");

const gcashContent = document.getElementById("gcash-content");
const cashContent = document.getElementById("cash-content");

gcashTab.addEventListener("click", () => {
  gcashTab.classList.add("active");
  cashTab.classList.remove("active");
  gcashContent.classList.remove("hidden");
  cashContent.classList.add("hidden");
});

cashTab.addEventListener("click", () => {
  cashTab.classList.add("active");
  gcashTab.classList.remove("active");
  cashContent.classList.remove("hidden");
  gcashContent.classList.add("hidden");
});

document.addEventListener("DOMContentLoaded", () => {
  const paymentForm = document.querySelector("#paymentForm");

  const userId = "U0001"; // Replace later with session variable
  const rideId = localStorage.getItem("selectedRideId") || "R0001";

  // Load user info
  fetch(`includes/get_user_info.php?userId=${userId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.user) {
        const u = data.user;
        document.getElementById("fullName").value = u.name || "";
        document.getElementById("idNumber").value = u.userID || "";
        document.getElementById("email").value = u.email || "";
      }
    })
    .catch(err => console.error("Error loading user info:", err));

  // Submit payment form
  paymentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(paymentForm);
    formData.append("userId", userId);
    formData.append("rideId", rideId);
    formData.append("amount", 50);

    fetch("includes/payment_handler.php", {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("✅ Payment successfully recorded!");
          window.location.href = "receipt.html";
        } else {
          alert("❌ " + data.message);
        }
      })
      .catch(err => console.error("Error submitting payment:", err));
  });
});
=======
// Tab switch logic
const gcashTab = document.getElementById("gcash-tab");
const cashTab = document.getElementById("cash-tab");

const gcashContent = document.getElementById("gcash-content");
const cashContent = document.getElementById("cash-content");

gcashTab.addEventListener("click", () => {
  gcashTab.classList.add("active");
  cashTab.classList.remove("active");
  gcashContent.classList.remove("hidden");
  cashContent.classList.add("hidden");
});

cashTab.addEventListener("click", () => {
  cashTab.classList.add("active");
  gcashTab.classList.remove("active");
  cashContent.classList.remove("hidden");
  gcashContent.classList.add("hidden");
});

document.addEventListener("DOMContentLoaded", () => {
  const paymentForm = document.querySelector("#paymentForm");

  const userId = "U0001"; // Replace later with session variable
  const rideId = localStorage.getItem("selectedRideId") || "R0001";

  // Load user info
  fetch(`includes/get_user_info.php?userId=${userId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.user) {
        const u = data.user;
        document.getElementById("fullName").value = u.name || "";
        document.getElementById("idNumber").value = u.userID || "";
        document.getElementById("email").value = u.email || "";
      }
    })
    .catch(err => console.error("Error loading user info:", err));

  // Submit payment form
  paymentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(paymentForm);
    formData.append("userId", userId);
    formData.append("rideId", rideId);
    formData.append("amount", 50);

    fetch("includes/payment_handler.php", {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("✅ Payment successfully recorded!");
          window.location.href = "receipt.html";
        } else {
          alert("❌ " + data.message);
        }
      })
      .catch(err => console.error("Error submitting payment:", err));
  });
});
>>>>>>> 201e08c01aa2bcd04b63db67f52ccfcfc558a689
