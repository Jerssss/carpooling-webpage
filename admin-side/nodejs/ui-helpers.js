/**
 * UI Helpers - Modal and common UI utilities
 */

/**
 * Open user modal
 */
function openUserModal() {
    document.getElementById("userModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

/**
 * Close user modal
 */
function closeUserModal() {
    document.getElementById("userModal").classList.add("hidden");
    document.body.style.overflow = "auto";
}

/**
 * Open vehicle modal
 */
function openVehicleModal() {
    const modal = document.getElementById("vehicleModal");
    if (modal) modal.style.display = "block";
}

/**
 * Close vehicle modal
 */
function closeVehicleModal() {
    const modal = document.getElementById("vehicleModal");
    if (modal) modal.style.display = "none";
}

/**
 * Open report modal
 */
function openReportModal() {
    const modal = document.getElementById("reportModal");
    if (modal) modal.style.display = "block";
}

/**
 * Close report modal
 */
function closeReportModal() {
    const modal = document.getElementById("reportModal");
    if (modal) modal.style.display = "none";
}

/**
 * Open ride modal
 */
function openRideModal() {
    const modal = document.getElementById("rideModal");
    if (modal) modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

/**
 * Close ride modal
 */
function closeRideModal() {
    const modal = document.getElementById("rideModal");
    if (modal) modal.classList.add("hidden");
    document.body.style.overflow = "auto";
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Format date to locale string
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (err) {
        return dateString;
    }
}

/**
 * Setup modal backdrop close handlers
 */
function setupModalBackdropClosers() {
    // User modal
    const userModal = document.getElementById("userModal");
    if (userModal) {
        userModal.addEventListener('click', (e) => {
            if (e.target === userModal) closeUserModal();
        });
    }

    // Vehicle modal
    const vehicleModal = document.getElementById("vehicleModal");
    if (vehicleModal) {
        vehicleModal.addEventListener('click', (e) => {
            if (e.target === vehicleModal) closeVehicleModal();
        });
    }

    // Report modal
    const reportModal = document.getElementById("reportModal");
    if (reportModal) {
        reportModal.addEventListener('click', (e) => {
            if (e.target === reportModal) closeReportModal();
        });
    }

    // Ride modal
    const rideModal = document.getElementById("rideModal");
    if (rideModal) {
        rideModal.addEventListener('click', (e) => {
            if (e.target === rideModal) closeRideModal();
        });
    }
}

export {
    openUserModal, closeUserModal,
    openVehicleModal, closeVehicleModal,
    openReportModal, closeReportModal,
    openRideModal, closeRideModal,
    truncateText, formatDate,
    setupModalBackdropClosers
};
