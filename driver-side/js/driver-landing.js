document.addEventListener("DOMContentLoaded", () => {
    const scheduleList = document.querySelector(".schedule-list");
    const rightPanel = document.querySelector(".right-panel");
    const greetingHeader = document.querySelector(".left-panel h2");

    const BASE = "/9467_it312-teamarc_midtermproject";
    const scheduleEndpoint = `${BASE}/driver-side/includes/fetch_driver_schedule.php`;
    const sessionEndpoint  = `${BASE}/driver-side/includes/get_session_user.php`;

    let driverId = null;

    scheduleList.innerHTML = "";
    rightPanel.innerHTML = "";

    // Fetch session user
    fetch(sessionEndpoint)
        .then(res => res.json())
        .then(user => {
            if (user && user.user_id && user.name) {
                greetingHeader.textContent = `Welcome! ${user.name},`;
                driverId = user.user_id;
            } else {
                greetingHeader.textContent = `Welcome!`;
            }

            loadSchedule();
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

                const rides = data.rides || [];

                rides.forEach(ride => {
                    if (!ride.passengers) ride.passengers = [];

                    // Filter out driver mistakenly appearing as passenger
                    const filteredPassengers = ride.passengers.filter(
                        p => p.userId !== driverId
                    );

                    // ✅ Skip rides with NO passengers
                    if (filteredPassengers.length === 0) return;

                    ride.passengers = filteredPassengers;
                    const dateKey = ride.date.replace(/\D/g, "");

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

    function createScheduleWindow(ride, dateKey) {
        const div = document.createElement("div");
        div.classList.add("content-window");
        div.id = `day-${dateKey}`;

        let passengersHTML = "";

        ride.passengers.forEach(p => {
            const picPath = p.picture
                ? `../${p.picture}`
                : `../images/p1.png`;

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
