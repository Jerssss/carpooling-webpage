document.addEventListener("DOMContentLoaded", () => {
    const scheduleList = document.querySelector(".schedule-list");
    const rightPanel = document.querySelector(".right-panel");
    const greetingHeader = document.querySelector(".left-panel h2");

    const BASE = "/9467_it312-teamarc_midtermproject";
    const scheduleEndpoint = `${BASE}/driver-side/includes/fetch_driver_schedule.php`;
    const sessionEndpoint  = `${BASE}/driver-side/includes/get_session_user.php`;
    const completeRideEndpoint = `${BASE}/driver-side/includes/complete_ride.php`;

    let driverId = null;

    scheduleList.innerHTML = "";
    rightPanel.innerHTML = "";

    // ---- FETCH SESSION USER ----
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
        .catch(err => console.error("Session error:", err));

    // ---- LOAD SCHEDULE ----
    function loadSchedule() {
        fetch(scheduleEndpoint)
            .then(res => res.json())
            .then(data => {
                scheduleList.innerHTML = "";
                rightPanel.innerHTML = "";

                const rides = Array.isArray(data.rides) ? data.rides : [];

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                rides
                    .filter(r => r.status !== "completed")
                    .filter(r => {
                        const d = new Date(r.date);
                        d.setHours(0, 0, 0, 0);
                        return d >= today;
                    })
                    .forEach(ride => {
                        if (!Array.isArray(ride.passengers)) ride.passengers = [];

                        // Remove driver from passengers list
                        ride.passengers = ride.passengers.filter(
                            p => p.userId !== driverId
                        );

                        const dateKey = ride.date.replace(/\D/g, "");

                        // ---- LEFT PANEL CARD ----
                        const card = document.createElement("div");
                        card.className = "schedule-card";
                        card.dataset.target = `day-${dateKey}`;
                        card.innerHTML = `
                            <p class="date">${ride.date}</p>
                            <p class="route">${ride.from} → ${ride.to}</p>
                            <p class="desc">
                                ${ride.passengers.length === 0
                                    ? "No passengers yet"
                                    : `Passengers: ${ride.passengers.length}`}
                            </p>
                        `;

                        scheduleList.appendChild(card);
                        createScheduleWindow(ride, dateKey);
                    });

                assignClicks();
            })
            .catch(err => console.error("Schedule error:", err));
    }

    // ---- CREATE RIGHT PANEL CONTENT ----
    function createScheduleWindow(ride, dateKey) {
        const div = document.createElement("div");
        div.className = "content-window";
        div.id = `day-${dateKey}`;

        div.innerHTML = `
            <h1>${ride.date}</h1>
            <h2 class="route-title">${ride.from} → ${ride.to}</h2>
            <p class="time">${ride.time}</p>
            <h2 class="section-title">Passengers</h2>
        `;

        const passengerList = document.createElement("div");
        passengerList.className = "passenger-list";

        // ---- EMPTY PASSENGERS STATE ----
        if (ride.passengers.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-passengers";
            empty.textContent = "No passengers yet";
            passengerList.appendChild(empty);
        } 
        // ---- PASSENGERS EXIST ----
        else {
            ride.passengers.forEach(p => {
                const card = document.createElement("div");
                card.className = "passenger-card";

                card.innerHTML = `
                    <img src="${p.picture ? `../${p.picture}` : '../images/p1.png'}" class="profile-img">
                    <div class="info">
                        <p class="name">${p.name}</p>
                        <p class="num">${p.phone}</p>
                        <p class="loc">${p.pickupLocation}</p>
                    </div>
                    <button class="loc-icon-btn" type="button">
                        <img src="../images/location.png" class="loc-icon">
                    </button>
                `;

                passengerList.appendChild(card);
            });
        }

        div.appendChild(passengerList);

        // ---- MARK AS DONE BUTTON ----
        const wrap = document.createElement("div");
        wrap.className = "complete-ride-wrap";

        const button = document.createElement("button");
        button.className = "complete-ride-btn";
        button.textContent = "Mark as Done";

        button.addEventListener("click", () => {
            if (!confirm("Mark this ride as completed?")) return;

            fetch(completeRideEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ historyIds: ride.historyIds })
            })
            .then(res => res.json())
            .then(result => {
                if (result.ok) {
                    alert("Ride completed!");
                    document
                        .querySelector(`[data-target="day-${dateKey}"]`)
                        ?.remove();
                    div.remove();
                } else {
                    alert(result.error || "Failed to complete ride");
                }
            })
            .catch(err => {
                console.error(err);
                alert("Server error");
            });
        });

        wrap.appendChild(button);
        div.appendChild(wrap);
        rightPanel.appendChild(div);
    }

    // ---- LEFT PANEL CLICK ----
    function assignClicks() {
        document.querySelectorAll(".schedule-card").forEach(card => {
            card.addEventListener("click", () => {
                const target = card.dataset.target;

                document
                    .querySelectorAll(".content-window")
                    .forEach(w => w.classList.remove("active"));

                document
                    .getElementById(target)
                    ?.classList.add("active");
            });
        });
    }
});
