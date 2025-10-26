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
        e.stopPropagation(); // keep dropdown open

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

// Keep clicks inside dropdown from closing it
document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.getElementById("notificationsDropdown");
    if (dropdown) {
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }
    initializeNotificationTabs();
});

// Close only when clicking completely outside the bell/dropdown
document.addEventListener('click', function (e) {
    const dropdown = document.getElementById("notificationsDropdown");
    const insideBell = e.target.closest('.nav-bell');
    if (dropdown && dropdown.classList.contains('show') && !insideBell) {
        dropdown.classList.remove('show');
    }
});

document.addEventListener('DOMContentLoaded', () => {

  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      window.location.href = "list-of-carpools.html";  // adjust if file name is different
    });
  }

  const bookBtn = document.getElementById("bookBtn");
  if (bookBtn) {
    bookBtn.addEventListener("click", () => {
      window.location.href = "loading.html"; // placeholder (you will make later)
    });
  }

});
