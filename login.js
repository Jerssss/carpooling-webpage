// Get elements
const registerLink = document.getElementById('register-link');
const modal = document.getElementById('register-modal');
const closeModal = document.getElementById('close-modal');

// Open modal when register link is clicked
registerLink.addEventListener('click', function(e){
    e.preventDefault();
    modal.style.display = 'flex';
});

// Close modal when X button is clicked
closeModal.addEventListener('click', function(){
    modal.style.display = 'none';
});

// Close modal when clicking outside the modal content
window.addEventListener('click', function(e){
    if(e.target === modal){
        modal.style.display = 'none';
    }
});

// Redirect to respective registration pages
document.getElementById('driver-btn').addEventListener('click', function(){
    window.location.href = 'registration-driver.html';
});

document.getElementById('passenger-btn').addEventListener('click', function(){
    window.location.href = 'registration-passenger.html';
});

document.getElementById('multirole-btn').addEventListener('click', function(){
    window.location.href = 'registration-pd.html';
});