// Function to format currency
function formatCurrency(amount) {
    return '₱' + parseFloat(amount).toFixed(2);
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
        const response = await fetch(`../includes/receipt.php?rideId=${rideId}`);
        const result = await response.json();

        if (result.error) {
            console.error('Error:', result.error);
            alert('Error loading receipt: ' + result.error);
            return;
        }

        const data = result.data;

        // Populate receipt fields using DOM manipulation
        updateReceiptField('method', data.method);
        updateReceiptField('rideId', data.rideId);
        updateReceiptField('pickupTime', data.pickupTime);
        updateReceiptField('paymentId', data.paymentId);
        updateReceiptField('destination', data.destination);
        // updateReceiptField('discount', formatCurrency(data.discount));
        // updateReceiptField('subtotal', formatCurrency(data.subtotal));
        updateReceiptField('total', formatCurrency(data.total));

        // Optional status indicator
        addStatusBadge(data.status);

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
            'method:': 'method',
            'carpool driver:': 'rideId',
            'booking time:': 'pickupTime',
            'transaction id:': 'paymentId',
            'destination:': 'destination',
            'discount:': 'N/A',
            'subtotal:': 'N/A',
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

// Function to add status badge (optional enhancement)
function addStatusBadge(status) {
    const receiptBox = document.querySelector('.receipt-box');
    let badge = document.querySelector('.status-badge');
    
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'status-badge';
        receiptBox.insertBefore(badge, receiptBox.firstChild.nextSibling);
    }
    
    badge.textContent = status;
    badge.className = `status-badge status-${status.toLowerCase()}`;
}

// Get payment ID from URL parameter
function getPaymentIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('rideId');
}

// Initialize receipt when page loads
document.addEventListener('DOMContentLoaded', function() {
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

