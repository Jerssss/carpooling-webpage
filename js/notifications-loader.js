// js/notifications-loader.js
// Loads the shared notifications.html snippet into any page and initializes the UI.
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
  });
})();
