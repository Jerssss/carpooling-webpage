// js/notifications.js
document.addEventListener('DOMContentLoaded', () => {
    initializeNotificationTabs();
    // Load for the session user on initial load
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
        // Server resolves user from session; only send filter
        const url = `../includes/fetch_notifications.php${filter === 'unread' ? '?filter=unread' : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response not ok');

        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid data');

        if (data.length === 0) {
            list.innerHTML =
                `<div class="notif-item">
                <div class="notif-content">
                    <p>No notifications.</p>
                </div>
            </div>`;
            return;
        }

        list.innerHTML = '';
        data.forEach(n => {
            const item = document.createElement('div');
            item.classList.add('notif-item');
            if (!n.isRead) item.classList.add('unread'); else item.classList.add('read');

            item.dataset.notifId = n.id;

            item.innerHTML = `
                <img src="../images/user.png" alt="driver">
                <div class="notif-content">
                    <p>${(n.message)}</p>
                    <span class="time">${timeAgoISO(n.timestamp)}</span>
                </div>
            `;

            item.addEventListener('click', async () => {
                if (!n.isRead) {
                    const ok = await markAsRead(n.id);
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
        const res = await fetch('../includes/mark_read.php', { method: 'POST', body: form });
        const json = await res.json();
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
        const bell = document.querySelector('.nav-bell .bell-icon');
        const dropdown = document.getElementById('notificationsDropdown');
        if (!bell || !dropdown) return;

        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            const inside = e.target.closest('.nav-bell');
            if (!inside && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        });
    } catch (e) {
        // no-op
    }
}