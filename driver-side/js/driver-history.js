console.log("SCRIPT LOADED");
console.log("Script is running!");

document.addEventListener("DOMContentLoaded", () => {
    const historyList = document.querySelector(".history-list");
    const rightPanel = document.querySelector(".right-panel");

    const historyEndpoint = `includes/fetch_driver_history.php`;

    historyList.innerHTML = "";
    rightPanel.innerHTML = '<div class="right-placeholder">Select a completed ride to view details and feedback</div>';

    fetch(historyEndpoint)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                historyList.innerHTML = `<p style="color:red;">${data.error}</p>`;
                return;
            }

            const historyEntries = Array.isArray(data.history) ? data.history : [];
            if (historyEntries.length === 0) {
                historyList.innerHTML = "<p>No completed rides found.</p>";
                return;
            }

            historyList.innerHTML = "";

            historyEntries.forEach((entry, idx) => {
                const uniqueKey = `${entry.rideId}-${entry.historyId}`;

                // LEFT CARD
                const card = document.createElement("div");
                card.className = "history-card";
                card.dataset.target = `day-${uniqueKey}`;
                card.innerHTML = `
                    <div class="card-left">
                        <img src="../images/car.png" class="avatar-sm" alt="Car"/>
                        <div class="card-info">
                            <div class="history-date">${entry.date}</div>
                            <div class="history-route">${entry.from} → ${entry.to}</div>
                        </div>
                    </div>
                    <div class="card-meta">
                        <div class="history-desc">Completed</div>
                        ${(!isNaN(Number(entry.rating))) ? `<div class="history-rating">★ ${entry.rating}</div>` : ""}
                    </div>
                `;
                historyList.appendChild(card);

                // RIGHT PANEL WINDOW
                createHistoryWindow(entry, uniqueKey);

                // Auto-select first
                if (idx === 0) {
                    setTimeout(() => {
                        card.classList.add("selected");
                        const target = document.getElementById(`day-${uniqueKey}`);
                        if (target) {
                            target.classList.add("active");
                            const placeholder = rightPanel.querySelector(".right-placeholder");
                            if (placeholder) placeholder.remove();
                        }
                    }, 50);
                }
            });

            assignClicks();
        })
        .catch(err => console.error("Error loading history:", err));

    function createHistoryWindow(entry, uniqueKey) {
        const div = document.createElement("div");
        div.className = "content-window";
        div.id = `day-${uniqueKey}`;

        const passengers = [entry.passengerName || "Unknown passenger"];
        const pictures = [entry.passengerPicture || "images/profile_pics/default-pic.png"];

        const passengerItems = passengers.map((p, i) => `
            <div class="passenger-item">
                <img src="../${pictures[i]}" class="profile-img-small">
                <div class="passenger-name">${p}</div>
            </div>
        `).join("");

        div.innerHTML = `
            <div class="ride-card">
                <div class="ride-header">
                    <h1>${entry.date}</h1>
                    <div class="route-title">${entry.from} → ${entry.to}</div>
                </div>

                <div class="details-header">
                    <div class="detail-item">
                        <img src="../images/fare.png" class="detail-icon">
                        <div class="label">Fare</div>
                        <div class="value">₱${entry.fare}</div>
                    </div>
                    <div class="detail-item">
                        ${entry.carPhoto
                            ? `<img src="../${entry.carPhoto}" class="detail-car-photo">`
                            : `<img src="../images/car.png" class="detail-icon">`}
                        <div class="label">Car</div>
                        <div class="value">${entry.car}</div>
                    </div>
                    <div class="detail-item">
                        <img src="../images/clock-icon.png" class="detail-icon">
                        <div class="label">Time</div>
                        <div class="value">${entry.time}</div>
                    </div>
                </div>

                <div class="passengers-section">
                    <h3>Passenger</h3>
                    <div class="passenger-list">${passengerItems}</div>
                </div>

                <h3>Feedback</h3>
                <div class="feedback-block">
                    <p>★ ${!isNaN(Number(entry.rating)) ? entry.rating : "—"}</p>
                    <p>${entry.comment || "No comment"}</p>
                </div>
            </div>
        `;

        rightPanel.appendChild(div);
    }

    function assignClicks() {
        const cards = document.querySelectorAll(".history-card");
        const windows = document.querySelectorAll(".content-window");

        cards.forEach(card => {
            card.addEventListener("click", () => {
                windows.forEach(w => w.classList.remove("active"));
                cards.forEach(c => c.classList.remove("selected"));

                const target = document.getElementById(card.dataset.target);
                if (target) target.classList.add("active");

                card.classList.add("selected");

                const placeholder = rightPanel.querySelector(".right-placeholder");
                if (placeholder) placeholder.remove();
            });
        });
    }
});
