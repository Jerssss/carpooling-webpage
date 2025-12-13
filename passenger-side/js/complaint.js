const BASE = '/9467_it312-teamarc_midtermproject';
let currentComplaintData = null;

// Character counter for textarea
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('complaintText');
    const charCount = document.getElementById('charCount');
    const charCounter = document.querySelector('.char-counter');
    
    if (textarea && charCount) {
        textarea.addEventListener('input', () => {
            const length = textarea.value.length;
            charCount.textContent = length;
            
            // Color coding
            charCounter.classList.remove('warning', 'error');
            if (length > 900) {
                charCounter.classList.add('error');
            } else if (length > 800) {
                charCounter.classList.add('warning');
            }
        });
    }
});

// Open complaint modal
function openComplaintModal(rideId, driverId, driverName) {
    // Debug
    console.log('Opening complaint modal with:', { rideId, driverId, driverName });
    
    // Validate required data
    if (!rideId || rideId === '' || rideId === 'undefined') {
        alert('Error: Ride ID is missing. Please try again or contact support.');
        console.error('Missing rideId:', rideId);
        return;
    }
    
    if (!driverId || driverId === '' || driverId === 'undefined') {
        alert('Error: Driver ID is missing. Please try again or contact support.');
        console.error('Missing driverId:', driverId);
        return;
    }
    
    currentComplaintData = { rideId, driverId, driverName };
    
    // Set modal content
    document.getElementById('complaintDriverName').textContent = driverName;
    document.getElementById('complaintRideId').value = rideId;
    document.getElementById('complaintDriverId').value = driverId;
    
    // Clear previous form data
    document.getElementById('complaintText').value = '';
    document.getElementById('charCount').textContent = '0';
    document.querySelector('.char-counter').classList.remove('warning', 'error');
    
    // Hide any previous messages
    const messageEl = document.getElementById('complaintMessage');
    messageEl.style.display = 'none';
    messageEl.className = 'complaint-message';
    
    // Show modal
    document.getElementById('complaintModal').style.display = 'block';
}

// Close complaint modal
function closeComplaintModal() {
    document.getElementById('complaintModal').style.display = 'none';
    currentComplaintData = null;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('complaintModal');
    if (event.target === modal) {
        closeComplaintModal();
    }
}

// Submit complaint
async function submitComplaint() {
    const complaintText = document.getElementById('complaintText').value.trim();
    
    // Validation
    if (!complaintText) {
        showComplaintMessage('Please describe what happened.', 'error');
        return;
    }
    
    if (complaintText.length < 10) {
        showComplaintMessage('Please provide more details (at least 10 characters).', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('.complaint-btn-submit');
    const loadingEl = document.querySelector('.complaint-loading');
    const formData = new FormData(document.getElementById('complaintForm'));
    
    // Disable submit button and show loading
    submitBtn.disabled = true;
    loadingEl.classList.add('active');
    hideComplaintMessage();
    
    try {
        const response = await fetch(`${BASE}/passenger-side/includes/submit_complaint.php`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned invalid response');
        }
        
        if (response.ok && result.success) {
            showComplaintMessage('Your report has been submitted successfully. We will review it shortly.', 'success');
            
            // Clear form
            document.getElementById('complaintText').value = '';
            
            // Close modal after 2 seconds
            setTimeout(() => {
                closeComplaintModal();
            }, 2000);
        } else {
            showComplaintMessage(result.error || 'Failed to submit report. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Error submitting complaint:', error);
        showComplaintMessage('An error occurred. Please try again later.', 'error');
    } finally {
        submitBtn.disabled = false;
        loadingEl.classList.remove('active');
    }
}

// Show message in modal
function showComplaintMessage(message, type) {
    const messageEl = document.getElementById('complaintMessage');
    messageEl.textContent = message;
    messageEl.className = `complaint-message ${type}`;
    messageEl.style.display = 'block';
}

// Hide message
function hideComplaintMessage() {
    const messageEl = document.getElementById('complaintMessage');
    messageEl.style.display = 'none';
}

// ESC key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('complaintModal');
        if (modal && modal.style.display === 'block') {
            closeComplaintModal();
        }
    }
});