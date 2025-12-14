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

// Helper: resolve DB paths to page-relative URLs
function resolvePath(path) {
  const DEFAULT = '../images/profile_pics/default-pic.png';
  if (!path) return DEFAULT;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('storage/')) return '../' + path;
  if (path.startsWith('images/')) return '../' + path;
  return DEFAULT;
}

// Apply profile image to elements
let PROFILE_IMG_PATH = null;
function applyProfileImage(path) {
  if (!path) return;
  PROFILE_IMG_PATH = path;
  const els = document.querySelectorAll('.user-pic, .profile-photo');
  els.forEach(img => {
    if (img && img.src.indexOf(path) === -1) img.src = path;
  });
}

// Observe for late-added profile image elements
const observer = new MutationObserver(mutations => {
  if (!PROFILE_IMG_PATH) return;
  for (const m of mutations) {
    if (m.addedNodes && m.addedNodes.length) {
      m.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches && (node.matches('.user-pic') || node.matches('.profile-photo'))) {
          node.src = PROFILE_IMG_PATH;
        }
        const imgs = node.querySelectorAll && node.querySelectorAll('.user-pic, .profile-photo');
        if (imgs && imgs.length) imgs.forEach(i => i.src = PROFILE_IMG_PATH);
      });
    }
  }
});
observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

// Load user name on driver profile
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch('../includes/get_driver_profile.php', { credentials: 'include' });
    const data = await res.json();
    if (data && data.success) {
      const p = data.profile || {};
      const nameEl = document.getElementById("userName");
      if (nameEl) nameEl.textContent = p.name || 'Driver';
      const imgPath = resolvePath(p.picture);
      applyProfileImage(imgPath);
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
