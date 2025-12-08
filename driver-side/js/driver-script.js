// driver-script.js
let subMenu = document.getElementById("subMenu");

function toggleMenu() {
    // Close other dropdowns
    const dropdown = document.getElementById("notificationsDropdown");
    const navLinks = document.querySelector('nav ul');

    if (dropdown) dropdown.classList.remove('show');
    if (navLinks) navLinks.classList.remove('show');

    // Toggle profile dropdown
    subMenu.classList.toggle("open-menu");
}

function toggleNotifications() {
    const dropdown = document.getElementById("notificationsDropdown");
    const navLinks = document.querySelector('nav ul');

    if (!dropdown) return console.warn("No notifications dropdown found to toggle.");

    // Close other dropdowns
    subMenu.classList.remove('open-menu');
    if (navLinks) navLinks.classList.remove('show');

    // Toggle notifications dropdown
    dropdown.classList.toggle("show");
}

function toggleMobileMenu() {
    const navLinks = document.querySelector('nav ul');
    const dropdown = document.getElementById("notificationsDropdown");

    // Close other dropdowns
    subMenu.classList.remove('open-menu');
    if (dropdown) dropdown.classList.remove('show');

    // Toggle mobile menu
    navLinks.classList.toggle('show');

    const hamburger = document.getElementById('hamburger');
    hamburger.classList.toggle('open');
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

// Prevent dropdown from closing when clicked inside
document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.getElementById("notificationsDropdown");
    if (dropdown) {
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }
    initializeNotificationTabs();
});

// Close all dropdowns when clicking outside
document.addEventListener('click', function (e) {
    const dropdown = document.getElementById("notificationsDropdown");
    const insideBell = e.target.closest('.nav-bell');
    const insideProfile = e.target.closest('.user-pic');
    const insideHamburger = e.target.closest('.hamburger');
    const navLinks = document.querySelector('nav ul');

    if (subMenu.classList.contains('open-menu') && !insideProfile) {
        subMenu.classList.remove('open-menu');
    }
    if (dropdown && dropdown.classList.contains('show') && !insideBell) {
        dropdown.classList.remove('show');
    }
    if (navLinks && navLinks.classList.contains('show') && !insideHamburger) {
        navLinks.classList.remove('show');
        const hamburger = document.getElementById('hamburger');
        if (hamburger) hamburger.classList.remove('open');
    }
});

// Load user name on driver profile
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch('../includes/get_driver_profile.php', { credentials: 'include' });
    const data = await res.json();
    if (data && data.success) {
      const p = data.profile || {};
      const nameEl = document.getElementById("userName");
      if (nameEl) nameEl.textContent = p.name || 'Driver';
      const pics = document.querySelectorAll('.user-pic');
      pics.forEach(img => { img.src = p.photoUrl || '../images/speed.jpg'; });
    }
  } catch (err) {
    console.error("Failed to load user profile:", err);
  }
});

// Ensure hero video tries to play
document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('bg-video');
  if (!video) return;
  try {
    const p = video.play && video.play();
    if (p && typeof p.then === 'function') {
      p.catch(() => {
        const handler = () => {
          video.play().catch(() => {});
        };
        document.addEventListener('click', handler, { once: true });
        document.addEventListener('touchstart', handler, { once: true });
      });
    }
  } catch (_) {
    // ignore
  }
});
