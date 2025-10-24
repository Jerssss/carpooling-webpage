let subMenu = document.getElementById("subMenu");

function toggleMenu() {
    subMenu.classList.toggle("open-menu");
}

let notificationsDropdown = document.getElementById("notificationsDropdown");

function toggleNotifications() {
    notificationsDropdown.classList.toggle("show");
}

// Tab switching
function switchTab(tab) {
    let allTab = document.getElementById("allTab");
    let unreadTab = document.getElementById("unreadTab");
    let notifItems = document.querySelectorAll("#notifList .notif-item");

    if(tab === "all") {
        allTab.classList.add("active");
        unreadTab.classList.remove("active");
        notifItems.forEach(item => item.style.display = "flex");
    } else {
        allTab.classList.remove("active");
        unreadTab.classList.add("active");
        notifItems.forEach(item => {
            if(item.classList.contains("unread")){
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }
        });
    }
}

// Close notification dropdown if clicked outside
document.addEventListener('click', function(e){
    if(!notificationsDropdown.contains(e.target) && !e.target.classList.contains('bell-icon')){
        notificationsDropdown.classList.remove('show');
    }
});
