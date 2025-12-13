// js/header-ui-loader.js
// Loads the shared notifications.html, snippet and the logout feature into any page and initializes the UI.
(function () {
  async function fetchSnippet() {
    const candidates = [
      '../notifications.html',
      './notifications.html',
      '/9467_it312-teamarc_midtermproject/notifications.html',
      '/notifications.html'
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) return await res.text();
      } catch (_) { /* try next */ }
    }
    return null;
  }

  function extractDropdown(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    // Prefer a direct dropdown element
    const dd = tmp.querySelector('.notifications-dropdown');
    if (dd) return dd;
    // Fallback: if the snippet wrapped in body
    const body = tmp.querySelector('body');
    if (body) return body.querySelector('.notifications-dropdown');
    return null;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const mounts = document.querySelectorAll('#notificationsContainer');
    if (!mounts.length) return;

    const html = await fetchSnippet();
    if (!html) return;

    const dropdownEl = extractDropdown(html);
    if (!dropdownEl) return;

    mounts.forEach((mount) => {
      try {
        // Remove any existing dropdowns inside the container
        mount.querySelectorAll('.notifications-dropdown').forEach(n => n.remove());
        // Append a cloned dropdown from the shared snippet
        mount.appendChild(dropdownEl.cloneNode(true));
      } catch (_) { /* ignore per-mount failures */ }
    });

    // Initialize interactions and load data after injection
    if (typeof window.initNotificationsUI === 'function') {
      window.initNotificationsUI();
    }

    // Also populate navbar user name consistently across pages
    try {
      const BASE = `${window.location.origin}/9467_it312-teamarc_midtermproject`;
      const res = await fetch(`${BASE}/includes/get_user_info.php`, { credentials: 'include', cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        console.debug('Navbar session user:', data.resolvedUserId, data.user?.name);
        const nameEl = document.getElementById('userName');
        if (nameEl && data && data.success && data.user) {
          nameEl.textContent = data.user.name || 'Unknown User';
        }
      }
    } catch (_) { /* ignore */ }

    // Ensure logout link in profile dropdown points to server-side handler
    try {
      const BASE = `${window.location.origin}/9467_it312-teamarc_midtermproject`;
      const candidates = [];
      document.querySelectorAll('.notifications-dropdown a, .notifications-dropdown button, a, button').forEach((el) => {
        const txt = (el.textContent || '').trim().toLowerCase();
        if (txt.includes('logout') || txt.includes('log out') || txt.includes('sign out')) {
          candidates.push(el);
        }
      });
      candidates.forEach((el) => {
        if (el.tagName === 'A') {
          el.setAttribute('href', `${BASE}/includes/logout.php`);
        } else if (el.tagName === 'BUTTON') {
          el.setAttribute('data-href', `${BASE}/includes/logout.php`);
          el.addEventListener('click', () => {
            window.location.href = `${BASE}/includes/logout.php`;
          }, { once: true });
        }
      });
    } catch (_) { /* ignore wiring issues */ }
  });
})();
