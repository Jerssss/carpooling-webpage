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

    // Also populate navbar user name/photo consistently across pages
    try {
      const BASE = `${window.location.origin}/9467_it312-teamarc_midtermproject`;
      // Try multiple endpoints to get session user info (driver/passenger)
      const endpoints = [
        `${BASE}/driver-side/includes/get_session_user.php`,
        `${BASE}/includes/get_user_info.php`
      ];
      let data = null;
      for (const url of endpoints) {
        try {
          const r = await fetch(url, { credentials: 'include', cache: 'no-cache' });
          if (r.ok) {
            const j = await r.json();
            if (j && (j.success || j.user || j.name)) { data = j; break; }
          }
        } catch (_) { /* try next */ }
      }

      if (data) {
        const user = data.user || data; // support different shapes
        const name = user.name || user.fullName || 'Unknown User';
        const picture = user.picture || user.photo || 'images/profile_pics/default-pic.png';

        const toAbs = (p) => {
          if (!p || typeof p !== 'string') return `${BASE}/images/profile_pics/default-pic.png`;
          const s = p.trim();
          if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('//')) return s;
          return `${BASE}/${s.replace(/^\/+/, '')}`;
        };

        const nameEl = document.getElementById('userName');
        if (nameEl) nameEl.textContent = name;

        const pics = document.querySelectorAll('.user-pic');
        pics.forEach(img => {
          try { img.src = toAbs(picture); } catch(_) { /* ignore */ }
          if (!img.alt || img.alt.toLowerCase() === 'user') img.alt = name;
        });
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
