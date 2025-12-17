// Function to format currency
function formatCurrency(amount) {
    return '₱' + parseFloat(amount).toFixed(2);
}

// Function to format ISO datetime into a friendly local string
function formatDateTime(iso) {
    if (!iso || iso === 'N/A') return iso || '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso; // fallback to raw string if invalid
    try {
        return new Intl.DateTimeFormat(undefined, {
            year: 'numeric', month: 'short', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
            hour12: true
        }).format(date);
    } catch (_) {
        return date.toLocaleString();
    }
}

// Function to fetch and populate receipt data
async function loadReceipt(rideId) {
    try {
        // Show loading state
        const placeholders = document.querySelectorAll('.receipt-box .placeholder');
        placeholders.forEach(el => {
            el.textContent = 'Loading...';
        });

        // Fetch receipt data from API
        const BASE = '/9467_it312-teamarc_midtermproject';
        const response = await fetch(`${BASE}/passenger-side/includes/receipt.php?rideId=${rideId}`);
        const result = await response.json();

        if (result.error) {
            console.error('Error:', result.error);
            alert('Error loading receipt: ' + result.error);
            return;
        }

        const data = result.data;

        // Format times for display
        const pickupTimeFmt = formatDateTime(data.pickupTime);
        const bookingTimeFmt = formatDateTime(data.bookingTime);

        // Populate receipt fields using DOM manipulation
        updateReceiptField('method', data.method);
        updateReceiptField('rideId', data.rideId);
        updateReceiptField('pickupTime', pickupTimeFmt);
        updateReceiptField('bookingTime', bookingTimeFmt);
        updateReceiptField('paymentId', data.paymentId);
        updateReceiptField('destination', data.destination);
        updateReceiptField('driverName', data.driverName);
        updateReceiptField('discount', formatCurrency(data.discount));
        updateReceiptField('subtotal', formatCurrency(data.subtotal));
        updateReceiptField('total', formatCurrency(data.total));

        // Populate left-side Transaction Details
        setInputValue('fullName', data.name);
        setInputValue('idNumber', data.idNumber);
        setInputValue('email', data.email);
        setInputValue('pickupTimeInput', pickupTimeFmt);
        setInputValue('pickupLocationInput', data.pickupLocation);

        // Status badge removed per spec (no 'pending' display)

    } catch (error) {
        console.error('Error fetching receipt:', error);
        alert('Failed to load receipt data');
    }
}

// Helper function to update receipt fields
function updateReceiptField(fieldName, value) {
    const receiptItems = document.querySelectorAll('.receipt-item');

    receiptItems.forEach(item => {
        const label = item.querySelector('span:first-child').textContent.toLowerCase();

        // Match field names with labels
        const fieldMap = {
            'payment type:': 'method',
            'carpool driver:': 'driverName',
            'booking time:': 'bookingTime',
            'transaction id:': 'paymentId',
            'destination:': 'destination',
            'discount:': 'discount',
            'subtotal:': 'subtotal',
            'total:': 'total'
        };

        if (fieldMap[label] === fieldName) {
            const placeholder = item.querySelector('.placeholder');
            if (placeholder) {
                placeholder.textContent = value;
                placeholder.classList.add('loaded');
            }
        }
    });
}

// Helper to set read-only input values if element exists
function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
}

// Status badge intentionally removed

// Get payment ID from URL parameter
function getPaymentIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('rideId');
}

// Initialize receipt when page loads
document.addEventListener('DOMContentLoaded', function () {
    const BASE = '/9467_it312-teamarc_midtermproject';
    const rideId = getPaymentIdFromURL();

    if (rideId) {
        loadReceipt(rideId);
    } else {
        // For testing, use a default payment ID
        // Remove this in production
        console.warn('No ride ID provided. Using test data.');
        loadReceipt('P69146b5955383');
    }
});

