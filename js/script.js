// script.js
let subMenu = document.getElementById("subMenu");

function toggleMenu() {
    subMenu.classList.toggle("open-menu");
}

function toggleNotifications() {
    const dropdown = document.getElementById("notificationsDropdown");
    if (dropdown) {
        dropdown.classList.toggle("show");
    } else {
        console.warn("No notifications dropdown found to toggle.");
    }
}

function initializeNotificationTabs() {
    const tabs = document.querySelector(".notif-tabs");
    if (!tabs) return;

    tabs.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.id !== "allTab" && target.id !== "unreadTab") return;

        e.preventDefault();
        e.stopPropagation();

        switchTab(target.id === "allTab" ? "all" : "unread");
    });
}

function switchTab(tab) {
    const allTab = document.getElementById("allTab");
    const unreadTab = document.getElementById("unreadTab");
    const notifItems = document.querySelectorAll("#notifList .notif-item");
    if (!allTab || !unreadTab || notifItems.length === 0) return;

    if (tab === "all") {
        allTab.classList.add("active");
        unreadTab.classList.remove("active");
        notifItems.forEach(item => item.style.display = "flex");
    } else {
        allTab.classList.remove("active");
        unreadTab.classList.add("active");
        notifItems.forEach(item => {
            item.style.display = item.classList.contains("unread") ? "flex" : "none";
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.getElementById("notificationsDropdown");
    if (dropdown) {
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }
    initializeNotificationTabs();
});

document.addEventListener('click', function (e) {
    const dropdown = document.getElementById("notificationsDropdown");
    const insideBell = e.target.closest('.nav-bell');
    if (dropdown && dropdown.classList.contains('show') && !insideBell) {
        dropdown.classList.remove('show');
    }
});

document.addEventListener("DOMContentLoaded", async () => {
  const bookBtn = document.getElementById("bookBtn");
  const popup = document.getElementById("confirmationPopup");
  const popupCancel = document.getElementById("cancelBooking");
  const popupProceed = document.getElementById("proceedBooking");
  const driverNameEl = document.getElementById("driverNamePlaceholder");

  // Extract rideId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const rideId = urlParams.get("rideId");

  if (!rideId) return;

  // Fetch only the driver’s name from your PHP file
  try {
    const response = await fetch(`includes/view_carpool.php?rideId=${rideId}`);
    const data = await response.json();

    if (!data || data.error) {
      console.error(data?.error || "Failed to load ride details.");
      return;
    }

    if (driverNameEl) driverNameEl.textContent = data.driverName;
  } catch (err) {
    console.error("Error fetching ride details:", err);
  }

  // Show popup when clicking "Book Now"
  if (bookBtn) {
    bookBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (popup) popup.style.display = "flex";
    });
  }

  // Hide popup on cancel
  if (popupCancel) {
    popupCancel.addEventListener("click", () => {
      if (popup) popup.style.display = "none";
    });
  }

  // Proceed to payment
  if (popupProceed) {
    popupProceed.addEventListener("click", () => {
      window.location.href = `payment-gateway.html?rideId=${rideId}`;
    });
  }
});
