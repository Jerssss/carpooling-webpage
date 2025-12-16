document.addEventListener("DOMContentLoaded", () => {
    const historyList = document.querySelector(".history-list");
    const rightPanel = document.querySelector(".right-panel");

    const BASE = "/9467_it312-teamarc_midtermproject";
    const historyEndpoint = `${BASE}/../includes/fetch_driver_history.php`;

    historyList.innerHTML = "";
    rightPanel.innerHTML = "<h2>Select a completed ride to view details and feedback</h2>";

    fetch(historyEndpoint)
        .then(res => res.json())
        .then(data => {
            const historyEntries = Array.isArray(data.history) ? data.history : [];

            historyEntries.forEach(entry => {
                const dateKey = entry.date.replace(/\D/g, "");

                // LEFT PANEL card
                const card = document.createElement("div");
                card.className = "history-card";
                card.dataset.target = `day-${dateKey}`;
                card.innerHTML = `
                    <p class="date">${entry.date}</p>
                    <p class="route">${entry.from} → ${entry.to}</p>
                    <p class="desc">Completed ride</p>
                `;
                historyList.appendChild(card);

                // RIGHT PANEL content
                createHistoryWindow(entry, dateKey);
            });

            assignClicks();
        })
        .catch(err => console.error("Error loading history:", err));

    function createHistoryWindow(entry, dateKey) {
        const div = document.createElement("div");
        div.classList.add("content-window");
        div.id = `day-${dateKey}`;

        div.innerHTML = `
            <h1>${entry.date}</h1>
            <p><strong>Passenger:</strong> ${entry.passengerName}</p>
            <img src="../${entry.passengerPicture}" class="profile-img-small" />
            <p><strong>From:</strong> ${entry.from}</p>
            <p><strong>To:</strong> ${entry.to}</p>
            <p><strong>Fare:</strong> ₱${entry.fare}</p>
            <p><strong>Car:</strong> ${entry.car}</p>
            <p><strong>Time:</strong> ${entry.time}</p>
            <h3>Feedback</h3>
            <p><strong>Rating:</strong> ${entry.rating}</p>
            <p><strong>Comment:</strong> ${entry.comment}</p>
        `;

        rightPanel.appendChild(div);
    }

    function assignClicks() {
        const cards = document.querySelectorAll(".history-card");
        const windows = document.querySelectorAll(".content-window");

        cards.forEach(card => {
            card.addEventListener("click", () => {
                windows.forEach(w => w.classList.remove("active"));
                const targetWindow = document.getElementById(card.dataset.target);
                if (targetWindow) targetWindow.classList.add("active");

                cards.forEach(c => c.classList.remove("selected"));
                card.classList.add("selected");
            });
        });
    }
});
