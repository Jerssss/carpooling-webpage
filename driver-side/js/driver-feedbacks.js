document.addEventListener("DOMContentLoaded", () => {
    const historySection = document.querySelector(".history-section");
    const feedbackSection = document.querySelector(".feedback-section");

    const endpoint = "/9467_it312-teamarc_midtermproject/driver-side/includes/fetch_feedbacks.php";

    fetch(endpoint, {
        method: "GET",
        credentials: "same-origin" // important: send PHP session cookie
    })
    .then(res => res.json())
    .then(json => {
        if (json.error) {
            console.error("Server error:", json.error);
            historySection.innerHTML = "<h2>History</h2><p>Unable to load feedbacks. Please make sure you are logged in.</p>";
            feedbackSection.innerHTML = "<h2>No Feedback</h2>";
            return;
        }

        if (!Array.isArray(json)) {
            console.error("Invalid response:", json);
            return;
        }

        const data = json;
        historySection.innerHTML = "<h2>History</h2>";
        feedbackSection.innerHTML = "";

        let grouped = {};

        // Group reviews by formatted date
        data.forEach(item => {
            const date = new Date(item.date);
            const formattedDate = date.toLocaleDateString("en-US");

            if (!grouped[formattedDate]) grouped[formattedDate] = [];
            grouped[formattedDate].push(item);
        });

        const dateKeys = Object.keys(grouped);

        if (dateKeys.length === 0) {
            historySection.innerHTML += `<p>No feedback yet.</p>`;
            feedbackSection.innerHTML = `<h2>No Feedback</h2>`;
            return;
        }

        // Sort newest → oldest
        dateKeys.sort((a, b) => new Date(b) - new Date(a));

        // Build history date cards
        dateKeys.forEach(date => {
            const card = document.createElement("div");
            card.classList.add("history-card");
            card.dataset.date = date;
            card.textContent = date;
            historySection.appendChild(card);
        });

        // Click handler for date cards
        document.querySelectorAll(".history-card").forEach(card => {
            card.addEventListener("click", () => {
                loadFeedbacksForDate(card.dataset.date, grouped[card.dataset.date]);
            });
        });

        // Auto-load newest date
        loadFeedbacksForDate(dateKeys[0], grouped[dateKeys[0]]);
    })
    .catch(err => console.error("Error loading feedbacks:", err));


    /** Load feedback cards for a specific date **/
    function loadFeedbacksForDate(date, list) {
        feedbackSection.innerHTML = `<h2 id="feedback-date">${date}</h2>`;

        list.forEach(item => {
            const feedbackCard = document.createElement("div");
            feedbackCard.classList.add("feedback-card");

            feedbackCard.dataset.name = item.passengerName;
            feedbackCard.dataset.feedback = item.comment;
            feedbackCard.dataset.rating = item.rating;

            feedbackCard.innerHTML = `
                <div class="avatar">
                    <img src="${item.passengerPicture || '../assets/user-placeholder.png'}" />
                </div>

                <div class="info">
                    <div class="name">${item.passengerName}</div>
                    <div class="contact">${item.comment.substring(0, 40)}...</div>
                </div>

                <div class="rating">
                    ${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}
                </div>
            `;

            feedbackSection.appendChild(feedbackCard);
        });

        attachModalEvents();
    }


    /** Modal Handling **/
    function attachModalEvents() {
        const modal = document.getElementById("feedback-modal");
        const modalName = document.getElementById("modal-name");
        const modalFeedback = document.getElementById("modal-feedback");
        const modalRating = document.getElementById("modal-rating");
        const closeButton = document.querySelector(".close-button");

        document.querySelectorAll(".feedback-card").forEach(card => {
            card.addEventListener("click", () => {
                modalName.textContent = card.dataset.name;
                modalFeedback.textContent = card.dataset.feedback;

                const rating = parseInt(card.dataset.rating);
                modalRating.textContent =
                    "Rating: " +
                    "★".repeat(rating) +
                    "☆".repeat(5 - rating);

                modal.style.display = "block";
            });
        });

        closeButton.addEventListener("click", () => {
            modal.style.display = "none";
        });

        window.addEventListener("click", (event) => {
            if (event.target === modal) modal.style.display = "none";
        });
    }
});
