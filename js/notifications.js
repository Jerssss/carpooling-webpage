// js/notifications.js
document.addEventListener('DOMContentLoaded', () => {
    initializeNotificationTabs();
    loadNotificationsFromURL();
    // optional auto refresh:
    // setInterval(loadNotificationsFromURL, 30000);
});

function getUserIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('userId') || 'U0001';
}

function loadNotificationsFromURL(filter = 'all') {
    const userId = getUserIdFromURL();
    loadNotifications(userId, filter);
}

async function loadNotifications(userId, filter = 'all') {
    const list = document.getElementById('notifList');
    if (!list) return;

    list.innerHTML =
    `<div class="notif-item">
        <div class="notif-content">
            <p>Loading notifications...</p>
        </div>
     </div>`;

    try {
        const url = `includes/fetch_notifications.php?userId=${encodeURIComponent(userId)}${filter === 'unread' ? '&filter=unread' : ''}`;
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
                <img src="images/person-icon.png" alt="driver">
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
        const res = await fetch('includes/mark_read.php', { method: 'POST', body: form });
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
        loadNotificationsFromURL('all');
    });

    unreadTab.addEventListener('click', (e) => {
        unreadTab.classList.add('active');
        allTab.classList.remove('active');
        loadNotificationsFromURL('unread');
    });
}

function timeAgoISO(iso) {
    if (!iso) return '';
    const t = new Date(iso);
    if (isNaN(t)) return '';
    const diff = Math.floor((Date.now() - t.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
}