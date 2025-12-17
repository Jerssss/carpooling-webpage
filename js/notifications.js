// js/notifications.js
document.addEventListener('DOMContentLoaded', () => {
    initializeNotificationTabs();
    // Load for the session user on initial load (no-op if list absent)
    loadNotifications('all');
    // Wire bell toggle and outside-click close globally (no inline handlers needed)
    setupNotificationToggle();
    // optional auto refresh:
    // setInterval(() => loadNotifications(getActiveFilter()), 30000);
});

function getActiveFilter() {
    const unreadActive = document.getElementById('unreadTab')?.classList.contains('active');
    return unreadActive ? 'unread' : 'all';
}

async function loadNotifications(filter = 'all') {
    const list = document.getElementById('notifList');
    if (!list) return;

    list.innerHTML =
        `<div class="notif-item">
        <div class="notif-content">
            <p>Loading notifications...</p>
        </div>
     </div>`;

    try {
        // Resolve endpoint across pages (driver-side, passenger-side, root)
        const BASE = `${window.location.origin}/9467_it312-teamarc_midtermproject`;
        // Determine audience based on page context (passenger-side vs driver-side)
        const isPassengerPage = /\/passenger-side\//.test(window.location.pathname);
        const aud = isPassengerPage ? 'passenger' : 'driver';
        const url = `${BASE}/includes/fetch_notifications.php?aud=${aud}${filter === 'unread' ? '&filter=unread' : ''}`;
                const res = await fetch(url, { credentials: 'include', cache: 'no-cache' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const text = await res.text();
                if (text.trim().startsWith('<')) {
                        console.warn('Notifications endpoint returned HTML. First 200 chars:', text.slice(0,200));
                        // Gracefully render empty state instead of erroring out
                        list.innerHTML = `
                                <div class="notif-item">
                                    <div class="notif-content">
                                        <p>No notifications.</p>
                                    </div>
                                </div>`;
                        return;
                }
                const payload = JSON.parse(text);

        const data = Array.isArray(payload) ? payload : (payload?.notifications || []);

        // Local filter for unread if server didn't honor it
        const filtered = filter === 'unread' ? data.filter(n => !n.isRead) : data;

        if (filtered.length === 0) {
            list.innerHTML =
                `<div class="notif-item">
                <div class="notif-content">
                    <p>No notifications.</p>
                </div>
            </div>`;
            return;
        }

        list.innerHTML = '';
        filtered.forEach(n => {
            const item = document.createElement('div');
            item.classList.add('notif-item');
            if (!n.isRead) item.classList.add('unread'); else item.classList.add('read');

            const id = n.id || n._id || '';
            item.dataset.notifId = id;

            item.innerHTML = `
                <img src="../images/user.png" alt="driver">
                <div class="notif-content">
                    <p>${(n.message)}</p>
                    <span class="time">${timeAgoISO(n.timestamp)}</span>
                </div>
            `;

            item.addEventListener('click', async () => {
                if (!n.isRead) {
                    const ok = await markAsRead(id);
                    if (ok) {
                        item.classList.remove('unread');
                        item.classList.add('read');
                        n.isRead = true;
                        // If currently showing 'unread' filter, remove item from view
                        const unreadTabActive = document.getElementById('unreadTab')?.classList.contains('active');
                        if (unreadTabActive) item.style.display = 'none';
                    }
                }
            });

            list.appendChild(item);
        });

    } catch (err) {
        console.error('Error loading notifications:', err);
        list.innerHTML =
            `<div class="notif-item">
            <div class="notif-content">
                <p>Failed to load notifications</p>
            </div>
        </div>`;
    }
}

async function markAsRead(notifId) {
    try {
        const form = new FormData();
        form.append('notifId', notifId);
        const BASE = `${window.location.origin}/9467_it312-teamarc_midtermproject`;
        const url = `${BASE}/includes/mark_read.php`;
        const r = await fetch(url, { method: 'POST', body: form, credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        return json.success === true;
    } catch (err) {
        console.error('Error marking as read', err);
        return false;
    }
}

function initializeNotificationTabs() {
    const allTab = document.getElementById('allTab');
    const unreadTab = document.getElementById('unreadTab');

    if (!allTab || !unreadTab) return;

    allTab.addEventListener('click', (e) => {
        allTab.classList.add('active');
        unreadTab.classList.remove('active');
        loadNotifications('all');
    });

    unreadTab.addEventListener('click', (e) => {
        unreadTab.classList.add('active');
        allTab.classList.remove('active');
        loadNotifications('unread');
    });
}

function timeAgoISO(iso) {
    if (!iso) return '';
    const t = new Date(iso);
    if (isNaN(t)) return '';
    const diff = Math.floor((Date.now() - t.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

function setupNotificationToggle() {
    try {
        if (window.__notifToggleWired) return;
        const bell = document.querySelector('.nav-bell .bell-icon');
        if (!bell) return;
        window.__notifToggleWired = true;

        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = document.getElementById('notificationsContainer');
            if (!container) return;
            let dropdown = document.getElementById('notificationsDropdown');
            if (!dropdown) {
                // Fallback build if not injected yet
                dropdown = document.createElement('div');
                dropdown.className = 'notifications-dropdown';
                dropdown.id = 'notificationsDropdown';
                dropdown.innerHTML = `
                    <div class="notif-tabs">
                        <span class="active" id="allTab">All</span>
                        <span id="unreadTab">Unread</span>
                    </div>
                    <div class="notif-list" id="notifList">
                        <div class="notif-item">
                            <div class="notif-content">
                                <p>Loading notifications...</p>
                            </div>
                        </div>
                    </div>`;
                container.appendChild(dropdown);
                if (typeof window.initNotificationsUI === 'function') {
                    window.initNotificationsUI();
                } else {
                    initializeNotificationTabs();
                    loadNotifications('all');
                }
            }
            const nowShow = !dropdown.classList.contains('show');
            dropdown.classList.toggle('show', nowShow);
            container.classList.toggle('open', nowShow);
        });

        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('notificationsDropdown');
            const container = document.getElementById('notificationsContainer');
            if (!dropdown || !container) return;
            const inside = e.target.closest('.nav-bell');
            if (!inside && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
                container.classList.remove('open');
            }
        });
    } catch (e) {
        // no-op
    }
}

// Allow re-initialization after injecting notifications.html
window.initNotificationsUI = function () {
    initializeNotificationTabs();
    setupNotificationToggle();
    loadNotifications(getActiveFilter());
};

// Back-compat for pages using inline onclick="toggleNotifications()"
window.toggleNotifications = function() {
    try {
        // Ensure UI is wired
        setupNotificationToggle();
        const container = document.getElementById('notificationsContainer');
        if (!container) return;
        let dropdown = document.getElementById('notificationsDropdown');
        if (!dropdown) {
            // Fallback: create a minimal dropdown structure if injection failed
            dropdown = document.createElement('div');
            dropdown.className = 'notifications-dropdown';
            dropdown.id = 'notificationsDropdown';
            dropdown.innerHTML = `
                <div class="notif-tabs">
                    <span class="active" id="allTab">All</span>
                    <span id="unreadTab">Unread</span>
                </div>
                <div class="notif-list" id="notifList">
                    <div class="notif-item">
                        <div class="notif-content">
                            <p>Loading notifications...</p>
                        </div>
                    </div>
                </div>`;
            container.appendChild(dropdown);
            if (typeof window.initNotificationsUI === 'function') {
                window.initNotificationsUI();
            } else {
                initializeNotificationTabs();
                loadNotifications('all');
            }
        }
        const nowShow = !dropdown.classList.contains('show');
        dropdown.classList.toggle('show', nowShow);
        container.classList.toggle('open', nowShow);
    } catch (_) { /* ignore */ }
};