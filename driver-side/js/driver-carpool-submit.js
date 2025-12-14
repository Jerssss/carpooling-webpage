// Driver Carpool submission module
// Handles payload building, time validations via CarmaTime, and POST
(function(){
  function buildPayload(BASE, startSlotInput, endSlotInput) {
    const form = document.querySelector('.form-container form');
    if (!form) return null;
    const data = new FormData(form);
    const destinationText = data.get('destination');
    const lat = data.get('dest-lat');
    const lng = data.get('dest-lng');
    if (!destinationText) { alert('Please provide a destination.'); return null; }

    const startVal = startSlotInput && startSlotInput.value;
    const endVal = endSlotInput && endSlotInput.value;
    if (!(window.CarmaTime && CarmaTime.validateDeparture(startVal))) {
      alert('Please select a valid first time slot: future non-Sunday between 7:30 AM and 8:00 PM.');
      return null;
    }
    if (!endVal) { alert('Please select the second time slot.'); return null; }
    if (!(window.CarmaTime && CarmaTime.validateSecondSlot(startVal, endVal, 10))) {
      alert('Second slot must be later, same day, and at least 10 minutes after the first.');
      return null;
    }
    const departureDisplay = (window.CarmaTime && CarmaTime.buildDepartureDisplay(startVal, endVal)) || '';

    return {
      startLocation: document.getElementById('start-location') ? document.getElementById('start-location').value : data.get('start-location'),
      destination: destinationText,
      seats: (function(){ const el = document.getElementById('seats'); return el ? Number(el.value) : Number(data.get('seats')); })(),
      cost: (function(){ const el = document.getElementById('cost'); return el ? Number(el.value) : Number(data.get('cost')); })(),
      departure: startVal,
      departureTimeDisplay: departureDisplay,
      destLat: (function(){ const el = document.getElementById('dest-lat'); return el && el.value ? Number(el.value) : (lat ? Number(lat) : null); })(),
      destLng: (function(){ const el = document.getElementById('dest-lng'); return el && el.value ? Number(el.value) : (lng ? Number(lng) : null); })()
    };
  }

  async function submitCarpool(BASE, payload) {
    const res = await fetch(`${BASE}/driver-side/includes/create_carpool.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const json = await res.json();
    if (!res.ok || json.error) { throw new Error(json.error || `HTTP ${res.status}`); }
    alert('Carpool created successfully!');
    window.location.href = `${BASE}/driver-side/driver-landing.html`;
  }

  window.CarmaCarpoolSubmit = { buildPayload, submitCarpool };
})();
