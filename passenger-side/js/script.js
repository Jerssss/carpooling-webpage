// script.js
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

document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.getElementById("notificationsDropdown");
    if (dropdown) {
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }
    initializeNotificationTabs();
    // Populate navbar user name + picture from session-backed endpoint
    try {
      const BASE = `${window.location.origin}/9467_it312-teamarc_midtermproject`;

      function resolvePath(path) {
        const DEFAULT = '../images/profile_pics/default-pic.png';
        if (!path) return DEFAULT;
        if (/^https?:\/\//.test(path)) return path;
        let p = path.replace(/^\.\//, '').replace(/^\/+/, '');
        if (p.startsWith('storage/')) return '../' + p;
        if (p.startsWith('images/')) return '../' + p;
        return DEFAULT;
      }

      fetch(`${BASE}/includes/get_user_info.php`, { credentials: 'include', cache: 'no-cache' })
        .then(r => r.json()).then(data => {
          const nameEl = document.getElementById('userName');
          if (nameEl && data && data.success && data.user) {
            nameEl.textContent = data.user.name || 'Unknown User';
            const imgPath = resolvePath(data.user.picture);
            const pics = document.querySelectorAll('.user-pic');
            pics.forEach(img => { if (img) img.src = imgPath; });
            const dropdownImg = document.querySelector('.sub-menu .user-info img');
            if (dropdownImg) dropdownImg.src = imgPath;
          }
        }).catch(() => {});

      // Wire logout link to clear cookies + session
      const candidateLinks = Array.from(document.querySelectorAll('.sub-menu .sub-menu-link'));
      // Match by text content or the logout icon
      const logoutLink = candidateLinks.find(el => {
        const text = (el.textContent || '').toLowerCase();
        const img = el.querySelector('img');
        const imgSrc = (img && img.getAttribute('src')) || '';
        return text.includes('logout') || imgSrc.includes('user-logout');
      });
      if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Close dropdown immediately for UX
          const menu = document.getElementById('subMenu');
          if (menu) menu.classList.remove('open-menu');
          try {
            const res = await fetch(`${BASE}/includes/logout.php`, { credentials: 'include', cache: 'no-cache' });
            // Regardless of response, navigate to login to clear state
            window.location.href = `${BASE}/login.html`;
          } catch (_) {
            window.location.href = `${BASE}/login.html`;
          }
        });
      }
    } catch (_) {}
});

// Close all dropdowns if clicking outside
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

document.addEventListener("DOMContentLoaded", async () => {
  const BASE = '/9467_it312-teamarc_midtermproject';
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
    const response = await fetch(`${BASE}/passenger-side/includes/view_carpool.php?rideId=${rideId}`, { credentials: 'include' });
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

// Deprecated get_user_name; navbar is handled elsewhere now

// Ensure hero video tries to play; fall back to first user interaction
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
    // noop
  }
});