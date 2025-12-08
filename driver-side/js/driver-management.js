document.addEventListener("DOMContentLoaded", () => {
    const list = document.querySelector(".manage-list");

    const BASE = "/9467_it312-teamarc_midtermproject";
    const fetchEndpoint  = `${BASE}/driver-side/includes/fetch_driver_schedule.php`;
    const updateEndpoint = `${BASE}/driver-side/includes/update_carpool.php`;
    const deleteEndpoint = `${BASE}/driver-side/includes/delete_carpool.php`;

    const modal = document.getElementById("editModal");

    const editRideId = document.getElementById("edit_rideId");
    const editDate   = document.getElementById("edit_date");
    const editTime   = document.getElementById("edit_time");
    const editFrom   = document.getElementById("edit_from");
    const editTo     = document.getElementById("edit_to");
    const editSeats  = document.getElementById("edit_seats");
    const editPrice  = document.getElementById("edit_price");

    const saveBtn   = document.getElementById("saveEditBtn");
    const cancelBtn = document.getElementById("cancelEditBtn");

    function loadRides() {
        fetch(fetchEndpoint)
            .then(res => res.json())
            .then(data => {
                list.innerHTML = "";
                const rides = data.rides || [];

                rides.forEach(ride => {
                    list.innerHTML += `
                        <div class="manage-card">
                            <div class="info">
                                <p><strong>${ride.date}</strong></p>
                                <p>${ride.from} → ${ride.to}</p>
                                <p>${ride.time}</p>
                                <p>Seats: ${ride.passengers?.length || 0}/${ride.availableSeats ?? "?"}</p>
                            </div>

                            <div class="actions">
                                <button class="edit-btn" data-id="${ride.rideId}">Edit</button>
                                <button class="delete-btn" data-id="${ride.rideId}">Delete</button>
                            </div>
                        </div>
                    `;
                });

                bindButtons(rides);
            });
    }

    function bindButtons(rides) {
        document.querySelectorAll(".edit-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const rideId = btn.dataset.id;
                const ride = rides.find(r => r.rideId === rideId);

                if (!ride) return;

                modal.classList.remove("hidden");

                editRideId.value = ride.rideId;
                editDate.value   = ride.date;
                editTime.value   = ride.time;
                editFrom.value   = ride.from;
                editTo.value     = ride.to;
                editSeats.value  = ride.availableSeats ?? 0;
                editPrice.value  = ride.price ?? 0;
            });
        });

        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const rideId = btn.dataset.id;

                if (!confirm("Delete this carpool?")) return;

                fetch(deleteEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rideId })
                })
                .then(res => res.json())
                .then(resp => {
                    if (resp.success) {
                        alert("Deleted successfully");
                        loadRides();
                    } else {
                        alert(resp.error || "Delete failed");
                    }
                });
            });
        });
    }

    saveBtn.addEventListener("click", () => {
        const payload = {
            rideId: editRideId.value,
            date: editDate.value,
            departureTime: editTime.value,
            stationedAt: editFrom.value,
            destination: editTo.value,
            availableSeats: parseInt(editSeats.value),
            price: parseFloat(editPrice.value)
        };

        fetch(updateEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                alert("Updated successfully");
                modal.classList.add("hidden");
                loadRides();
            } else {
                alert(resp.error || "Update failed");
            }
        });
    });

    cancelBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    loadRides();
});
