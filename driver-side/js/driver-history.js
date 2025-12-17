console.log("SCRIPT LOADED");
console.log("Script is running!");

document.addEventListener("DOMContentLoaded", () => {
    const historyList = document.querySelector(".history-list");
    const rightPanel = document.querySelector(".right-panel");

    const BASE = "/9467_it312-teamarc_midtermproject";
    const historyEndpoint = `includes/fetch_driver_history.php`;

    historyList.innerHTML = "";
    rightPanel.innerHTML = '<div class="right-placeholder">Select a completed ride to view details and feedback</div>';

    console.log("Fetching from:", historyEndpoint);

    fetch(historyEndpoint)
        .then(res => {
            console.log("Response status:", res.status);
            return res.json();
        })
        .then(data => {
            console.log("Received data:", data);

            // Show debug info if available. Jorge alisin mo nalang mga to if di mo need 
            if (data.debug) {
                console.log("=== DEBUG INFO ===");
                console.log("Searched Driver ID:", data.debug.searchedDriverId);
                console.log("Total History Docs:", data.debug.totalHistoryDocs);
                console.log("Matched Docs:", data.debug.matchedDocs);
                console.log("Sample Driver IDs:", data.debug.sampleDriverIds);
                console.log("Name : ", data.name)
                console.log("==================");
            }

            // Check for errors
            if (data.error) {
                console.error("Error from server:", data.error);
                historyList.innerHTML = `<p style="color: red;">Error: ${data.error}</p>`;
                if (data.session_user_id !== undefined) {
                    console.log("Session User ID:", data.session_user_id);
                    console.log("Session Roles:", data.session_roles);
                }
                return;
            }

            const historyEntries = Array.isArray(data.history) ? data.history : [];

            // Debug
            console.log("Number of history entries:", historyEntries.length);

            if (historyEntries.length === 0) {
                historyList.innerHTML = "<p>No completed rides found.</p>";
                return;
            }

            historyList.innerHTML = ""; // Clear loading message

                        historyEntries.forEach((entry, idx) => {
                                const dateKey = entry.date.replace(/\D/g, "");

                                // LEFT PANEL card (improved layout)
                                const card = document.createElement("div");
                                card.className = "history-card";
                                card.dataset.target = `day-${dateKey}`;
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
                                            ${ (entry.rating && !isNaN(Number(entry.rating))) ? '<div class="history-rating">★ ' + entry.rating + '</div>' : '' }
                                        </div>
                                `;
                                historyList.appendChild(card);

                                // RIGHT PANEL content
                                createHistoryWindow(entry, dateKey);
                                // Auto-select first entry for better UX
                                if (idx === 0) {
                                        // highlight the first card after it's appended
                                        setTimeout(() => { card.classList.add('selected'); const target = document.getElementById(card.dataset.target); if (target) { target.classList.add('active'); const placeholder = rightPanel.querySelector('.right-placeholder'); if (placeholder) placeholder.remove(); } }, 50);
                                }
                        });

                        assignClicks();
        })
        .catch(err => console.error("Error loading history:", err));

    function createHistoryWindow(entry, dateKey) {
        const div = document.createElement("div");
        div.classList.add("content-window");
        div.id = `day-${dateKey}`;

        // Support single or multiple passengers
        const passengers = Array.isArray(entry.passengerName) ? entry.passengerName : [entry.passengerName || 'Unknown passenger'];
        const pictures = Array.isArray(entry.passengerPicture) ? entry.passengerPicture : [entry.passengerPicture || 'images/profile_pics/default-pic.png'];

        const passengerItems = passengers.map((pName, i) => {
            const pic = pictures[i] ? `../${pictures[i]}` : '../images/profile_pics/default-pic.png';
            return `<div class="passenger-item"><img src="${pic}" class="profile-img-small" alt="Passenger"/><div class="passenger-name">${pName}</div></div>`;
        }).join('');

        div.innerHTML = `
            <div class="ride-card">
              <div class="ride-header">
                <h1>${entry.date}</h1>
                <div class="route-title">${entry.from} → ${entry.to}</div>
              </div>

              <div class="details-header">
                <div class="detail-item detail-fare"><img src="../images/fare.png" class="detail-icon" alt="Fare"><div class="label">Fare</div><div class="value">₱${entry.fare}</div></div>
                <div class="detail-item detail-car">${ entry.carPhoto ? `<img src="../${entry.carPhoto}" class="detail-car-photo" alt="Car">` : `<img src="../images/car.png" class="detail-icon" alt="Car">` }<div class="label">Car</div><div class="value">${entry.car}</div></div>
                <div class="detail-item detail-time"><img src="../images/clock-icon.png" class="detail-icon" alt="Time"><div class="label">Time</div><div class="value">${entry.time}</div></div>
              </div>

              <div class="passengers-section">
                <h3 class="passenger-heading">Passenger${(passengers && passengers.length>1)? 's' : ''}</h3>
                <div class="passenger-list">
                  ${passengerItems}
                </div>
              </div>

              <h3>Feedback</h3>
              <div class="feedback-block">
                <p><img src="../images/star-gray.png" alt="Rating" class="feedback-icon"> ${ (entry.rating && !isNaN(Number(entry.rating))) ? entry.rating : '—' }</p>
                <p><img src="../images/chat.png" alt="Comment" class="feedback-icon"> ${entry.comment || 'No comment'}</p>
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
                // remove placeholder if present
                const placeholder = rightPanel.querySelector('.right-placeholder');
                if (placeholder) placeholder.remove();

                windows.forEach(w => w.classList.remove("active"));
                const targetWindow = document.getElementById(card.dataset.target);
                if (targetWindow) targetWindow.classList.add("active");

                cards.forEach(c => c.classList.remove("selected"));
                card.classList.add("selected");
            });
        });
    }
});
