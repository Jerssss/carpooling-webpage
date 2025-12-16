/**
 * Reports & Complaints Management Module
 */

import { apiGet, apiPatch } from './api.js';
import { closeReportModal, openReportModal } from './ui-helpers.js';

let allReports = [];
let currentComplaintId = null;

/**
 * Load all reports
 */
async function loadReports() {
    try {
        allReports = await apiGet("/reports");
        displayReports(allReports);
    } catch (err) {
        console.error("Error loading reports:", err);
        document.getElementById("reportList").innerHTML = `
            <div class="empty-state">
                <h3>Error loading reports</h3>
                <p>Please try refreshing the page</p>
            </div>
        `;
    }
}

/**
 * Display reports in the list
 */
function displayReports(reports) {
    const list = document.getElementById("reportList");

    const currentFilter = document.getElementById("statusFilter")?.value || "all";

    if (reports.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <h3>No reports found</h3>
                <p>There are no reports matching your filter criteria</p>
            </div>
        `;
        return;
    }

    list.innerHTML = `
        <header class="page-header">
            <h1>Reports & Complaints</h1>
            <p>Displaying all submitted reports</p>
        </header>

        <div class="filters">
            <div>
                <label for="statusFilter">Filter by Status:</label>
                <select id="statusFilter" onchange="window.reportsModule.filterReports()">
                    <option value="all">All Reports</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                </select>
            </div>
        </div>

        <div class="report-list-container" id="reportCards"></div>
    `;

    document.getElementById("statusFilter").value = currentFilter;

    const cardsContainer = document.getElementById("reportCards");

    reports.forEach(r => {
        const status = r.status || "pending";
        const statusClass = `status-${status.toLowerCase()}`;

        const card = document.createElement("div");
        card.className = "report-card";

        card.innerHTML = `
            <div class="report-info">
                <p><b>Complaint ID:</b> ${r.complaintId}</p>
                <p><b>Passenger:</b> ${r.passengerName} (${r.passengerId})</p>
                <p><b>Driver:</b> ${r.driverName} (${r.driverId})</p>
                <p><b>Issue:</b> ${(r.complaintMessage || "").substring(0, 60)}${(r.complaintMessage || "").length > 60 ? "..." : ""}</p>
            </div>

            <div class="report-footer">
                <div class="status-wrapper">
                    <span class="status-badge ${statusClass}">${status.toUpperCase()}</span>
                </div>

                <div class="actions-wrapper">
                    <button class="btn btn-view" onclick="window.reportsModule.viewReport('${r.complaintId}')">
                        View Details
                    </button>
                    <button class="btn btn-resolve"
                        onclick="window.reportsModule.markAsResolved('${r.complaintId}')"
                        ${status === "resolved" ? "disabled" : ""}>
                        ${status === "resolved" ? "Resolved" : "Resolve"}
                    </button>
                </div>
            </div>
        `;
        cardsContainer.appendChild(card);
    });
}

/**
 * Filter reports by status
 */
function filterReports() {
    const filter = document.getElementById("statusFilter").value;

    if (filter === "all") {
        displayReports(allReports);
    } else {
        const filtered = allReports.filter(r =>
            (r.status || "pending").toLowerCase() === filter.toLowerCase()
        );
        displayReports(filtered);
    }
}

/**
 * View report details in modal
 */
async function viewReport(complaintId) {
    try {
        currentComplaintId = complaintId;

        const report = await apiGet(`/reports/${complaintId}`);

        displayReportModal(report);

        document.getElementById("reportModal").style.display = "block";
    } catch (err) {
        console.error("Error viewing report:", err);
        alert("Failed to load report details");
    }
}

/**
 * Display report modal information
 */
function displayReportModal(report) {
    const status = report.status || "pending";
    const statusClass = `status-${status.toLowerCase()}`;

    document.getElementById("modalBody").innerHTML = `
        <div class="detail-section">
            <h3>Complaint Information</h3>
            <div class="detail-row"><span class="detail-label">Complaint ID:</span> <span class="detail-value">${report.complaintId}</span></div>
            <div class="detail-row"><span class="detail-label">Ride ID:</span> <span class="detail-value">${report.rideId || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Status:</span> <span class="status-badge ${statusClass}">${status}</span></div>
            <div class="detail-row"><span class="detail-label">Complaint Message:</span></div>
            <div class="complaint-text">${report.complaintMessage || "No message provided"}</div>
        </div>

        <div class="detail-section">
            <h3>Complainant Details</h3>
            <div class="detail-row"><span class="detail-label">Name:</span> <span class="detail-value">${report.passengerName || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Occupation:</span> <span class="detail-value">${report.passengerOccupation || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">ID Number:</span> <span class="detail-value">${report.passengerId}</span></div>
            <div class="detail-row"><span class="detail-label">Contact Number:</span> <span class="detail-value">${report.passengerPhone || report.passengerContact || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Email:</span> <span class="detail-value">${report.passengerEmail || "N/A"}</span></div>
        </div>

        <div class="detail-section">
            <h3>Driver Details</h3>
            <div class="detail-row"><span class="detail-label">Name:</span> <span class="detail-value">${report.driverName || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Occupation:</span> <span class="detail-value">${report.driverOccupation || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">ID Number:</span> <span class="detail-value">${report.driverId}</span></div>
            <div class="detail-row"><span class="detail-label">Contact Number:</span> <span class="detail-value">${report.driverPhone || report.driverContact || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Email:</span> <span class="detail-value">${report.driverEmail || "N/A"}</span></div>
        </div>

        <div class="detail-section">
            <h3>Vehicle Information</h3>
            <div class="detail-row"><span class="detail-label">Car ID:</span> <span class="detail-value">${report.carId || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Maker & Model:</span> <span class="detail-value">${report.carMake || ""} ${report.carModel || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Plate Number:</span> <span class="detail-value">${report.plateNo || "N/A"}</span></div>
        </div>

        <div class="detail-section">
            <h3>Ride Information</h3>
            <div class="detail-row"><span class="detail-label">Route:</span> <span class="detail-value">${report.rideOrigin || "N/A"} → ${report.rideDestination || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Date:</span> <span class="detail-value">${report.rideDate || "N/A"}</span></div>
        </div>
    `;

    const resolveBtn = document.getElementById("resolveBtn");
    if (resolveBtn) {
        resolveBtn.disabled = status === "resolved";
        resolveBtn.textContent = status === "resolved" ? "Already Resolved" : "Mark as Resolved";
    }
}

/**
 * Mark report as resolved
 */
async function markAsResolved(complaintId = null) {
    const id = complaintId || currentComplaintId;

    if (!id) {
        alert("No complaint selected");
        return;
    }

    if (!confirm("Are you sure you want to mark this report as resolved?")) {
        return;
    }

    try {
        await apiPatch(`/reports/${id}/status`, { status: "resolved" });

        alert("Report marked as resolved!");
        closeReportModal();
        loadReports();
    } catch (err) {
        console.error("Error resolving report:", err);
        alert("Failed to resolve report");
    }
}

export { loadReports, viewReport, filterReports, markAsResolved };
