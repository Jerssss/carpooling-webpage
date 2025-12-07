document.addEventListener("DOMContentLoaded", () => {
    const historyList = document.querySelector(".history-list");
    const rightPanel = document.querySelector(".right-panel");

    const BASE = "/9467_it312-teamarc_midtermproject";
    const historyEndpoint = `${BASE}/driver-side/includes/fetch_driver_history.php`;

    historyList.innerHTML = "";
    rightPanel.innerHTML = "";

    fetch(historyEndpoint)
        .then(res => res.json())
        .then(data => {
            const historyEntries = Array.isArray(data)
                ? data
                : (data.history || []);

            historyEntries.forEach(entry => {
                const dateKey = entry.date.replace(/\D/g, "");

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
            console.error("Error loading history:", err);
        });

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
        const cards = document.querySelectorAll(".schedule-card");
        const windows = document.querySelectorAll(".content-window");

        cards.forEach(card => {
            card.addEventListener("click", () => {
                const target = card.getAttribute("data-target");

                windows.forEach(w => w.classList.remove("active"));
                const targetWindow = document.getElementById(target);
                if (targetWindow) targetWindow.classList.add("active");
            });
        });
    }
});
