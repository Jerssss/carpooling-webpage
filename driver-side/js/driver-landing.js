document.addEventListener("DOMContentLoaded", () => {
    const scheduleList = document.querySelector(".schedule-list");
    const historyList = document.querySelector(".history-list");
    const rightPanel = document.querySelector(".right-panel");
    const greetingHeader = document.querySelector(".left-panel h2"); // first h2 for greeting

    const BASE = "/9467_it312-teamarc_midtermproject";
    const scheduleEndpoint = `${BASE}/driver-side/includes/fetch_driver_schedule.php`;
    const historyEndpoint = `${BASE}/driver-side/includes/fetch_driver_history.php`;
    const sessionEndpoint  = `${BASE}/driver-side/includes/get_session_user.php`;

    let driverId = null;

    // Clear default hardcoded content
    scheduleList.innerHTML = "";
    historyList.innerHTML = "";
    rightPanel.innerHTML = "";

    // Fetch session user first
    fetch(sessionEndpoint)
        .then(res => res.json())
        .then(user => {
            if (user && user.user_id && user.name) {
                greetingHeader.textContent = `Welcome! ${user.name},`;
                driverId = user.user_id; // use session user ID for filtering
            } else {
                greetingHeader.textContent = `Welcome!`;
            }

            // Load schedule & history after session is ready
            loadSchedule();
            loadHistory();
        })
        .catch(err => {
            console.error("Error fetching session user:", err);
        });

    function loadSchedule() {
        fetch(scheduleEndpoint)
            .then(res => res.json())
            .then(data => {
                scheduleList.innerHTML = "";
                rightPanel.innerHTML = "";

                const rides = data.rides || []; // fix: access rides key

                rides.forEach(ride => {
                    if (!ride.passengers) ride.passengers = [];

                    // Filter out driver if accidentally in passengers
                    const filteredPassengers = ride.passengers.filter(
                        p => p.userId !== driverId
                    );

                    ride.passengers = filteredPassengers;
                    const dateKey = ride.date.replace(/\D/g, '');

                    scheduleList.innerHTML += `
                        <div class="schedule-card" data-target="day-${dateKey}">
                            <p class="date">${ride.date}</p>
                            <p class="route">${ride.from} → ${ride.to}</p>
                            <p class="desc">Passengers: ${ride.passengers.length}</p>
                        </div>
                    `;

                    createScheduleWindow(ride, dateKey);
                });

                assignClicks();
            })
            .catch(err => {
                console.error("Error fetching schedule:", err);
            });
    }

    function loadHistory() {
        fetch(historyEndpoint)
            .then(res => res.json())
            .then(data => {
                historyList.innerHTML = "";

                const historyEntries = data.history || []; // fix: access history key

                historyEntries.forEach(entry => {
                    const dateKey = entry.date.replace(/\D/g, '');

                    historyList.innerHTML += `
                        <div class="schedule-card" data-target="day-${dateKey}">
                            <p class="date">${entry.date}</p>
                            <p class="route">${entry.from} → ${entry.to}</p>
                            <p class="desc">Completed ride</p>
                        </div>
                    `;

                    createHistoryWindow(entry, dateKey);
                });

                assignClicks();
            })
            .catch(err => {
                console.error("Error fetching history:", err);
            });
    }

    function createScheduleWindow(ride, dateKey) {
        const div = document.createElement("div");
        div.classList.add("content-window");
        div.id = `day-${dateKey}`;

        let passengersHTML = "";
        ride.passengers.forEach(p => {
            const picPath = p.picture && p.picture.startsWith('images/') ? `../${p.picture}` : `../images/${p.picture || 'p1.png'}`;
            passengersHTML += `
                <div class="passenger-card">
                    <img src="${picPath}" class="profile-img" />
                    <div class="info">
                        <p class="name">${p.name}</p>
                        <p class="num">${p.phone}</p>
                        <p class="loc">${p.pickupLocation}</p>
                    </div>
                    <button class="loc-icon-btn" type="button" title="Show on map">
                        <img src="../images/location.png" class="loc-icon" />
                    </button>
                </div>
            `;
        });

        div.innerHTML = `
            <h1>${ride.date}</h1>
            <h2 class="route-title">${ride.from} → ${ride.to}</h2>
            <p class="time">${ride.time}</p>
            <h2 class="pickup-title">For Pick Up</h2>
            <h2 class="section-title">Passengers</h2>
            <div class="passenger-list">${passengersHTML}</div>
        `;

        rightPanel.appendChild(div);
        // Bind map openers within this window
        div.querySelectorAll('.passenger-card').forEach(card => {
            const btn = card.querySelector('.loc-icon-btn');
            const locText = card.querySelector('.loc')?.textContent?.trim();
            const name = card.querySelector('.name')?.textContent?.trim() || 'Passenger';
            if (btn && locText && typeof window.showLocationOnMap === 'function') {
                btn.addEventListener('click', () => {
                    window.showLocationOnMap(locText, `${name}'s pickup`);
                });
            }
        });
    }

    function createHistoryWindow(entry, dateKey) {
        const div = document.createElement("div");
        div.classList.add("content-window");
        div.id = `day-${dateKey}`;

        div.innerHTML = `
            <h1>${entry.date}</h1>
            <p><strong>Passenger:</strong> ${entry.passengerName}</p>
            <p><strong>From:</strong> ${entry.from}</p>
            <p><strong>To:</strong> ${entry.to}</p>
            <p><strong>Fare:</strong> ₱${entry.fare}</p>
            <p><strong>Rating:</strong> ${entry.rating}</p>
        `;

        rightPanel.appendChild(div);
    }

    function assignClicks() {
        const cards = document.querySelectorAll('.schedule-card');
        const windows = document.querySelectorAll('.content-window');

        cards.forEach(card => {
            card.addEventListener('click', () => {
                const target = card.getAttribute('data-target');
                windows.forEach(w => w.classList.remove('active'));
                const targetWindow = document.getElementById(target);
                if (targetWindow) targetWindow.classList.add('active');
            });
        });
    }
});
