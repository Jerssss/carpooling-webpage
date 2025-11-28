// Driver Schedule Carpool interactions
// Requirements: Google Maps JavaScript API with Places library
// API Key should be set in window.GMAPS_API_KEY or replace placeholder below

(function(){
  const BASE = '/9467_it312-teamarc_midtermproject';
  const apiKey = window.GMAPS_API_KEY || 'GOOGLE_MAPS_API_KEY_HERE'; // TODO: replace

  const destinationInput = document.getElementById('destination');
  const openDestBtn = document.getElementById('openDestMapPicker');
  const startInput = document.getElementById('start-location');
  const openStartBtn = document.getElementById('openStartMapPicker');
  const departureInput = document.getElementById('departure');
  const mapModal = document.getElementById('mapModal');
  const closeMapBtn = document.getElementById('closeMapPicker');
  const useLocationBtn = document.getElementById('useLocation');
  const resetMarkerBtn = document.getElementById('resetMarker');
  const destLatEl = document.getElementById('dest-lat');
  const destLngEl = document.getElementById('dest-lng');
  const startLatEl = document.getElementById('start-lat');
  const startLngEl = document.getElementById('start-lng');

  let mapsLoaded = false;
  let autocompleteDest = null;
  let autocompleteStart = null;
  let map = null;
  let marker = null;
  let geocoder = null;
  let initialCenter = { lat: 16.4023, lng: 120.5960 }; // Baguio City center
  let pickerContext = 'destination'; // or 'start'

  function loadGoogleMaps(cb){
    if (mapsLoaded) return cb();
    if (!apiKey || apiKey === 'GOOGLE_MAPS_API_KEY_HERE') {
      console.warn('Google Maps API key missing. Autocomplete/map disabled.');
      return; // don't block typing; user can still submit text
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = function(){ mapsLoaded = true; cb(); };
    script.onerror = function(){ console.error('Failed to load Google Maps API'); };
    document.head.appendChild(script);
  }

  function initAutocomplete(){
    if (!window.google || !google.maps || !google.maps.places) return;
    autocompleteDest = new google.maps.places.Autocomplete(destinationInput, {
      fields: ['place_id', 'geometry', 'name', 'formatted_address'],
      types: ['geocode']
    });
    autocompleteStart = new google.maps.places.Autocomplete(startInput, {
      fields: ['place_id', 'geometry', 'name', 'formatted_address'],
      types: ['geocode']
    });
    // Bias results to Baguio/Benguet via componentRestrictions if available
    try {
      if (autocompleteDest.setComponentRestrictions) {
        autocompleteDest.setComponentRestrictions({ country: ['ph'] });
      }
    } catch(e) {}

    // Additional manual bounds around Baguio/Benguet
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(16.2000, 120.5000), // SW approx Benguet
      new google.maps.LatLng(16.6000, 121.0000)  // NE approx
    );
    autocompleteDest.setBounds(bounds);
    autocompleteDest.setOptions({ strictBounds: false });
    autocompleteStart.setBounds(bounds);
    autocompleteStart.setOptions({ strictBounds: false });

    autocompleteDest.addListener('place_changed', () => {
      const place = autocompleteDest.getPlace();
      if (!place || !place.geometry || !place.geometry.location) return;
      const location = place.geometry.location;
      const lat = location.lat();
      const lng = location.lng();
      destLatEl.value = lat;
      destLngEl.value = lng;

      // Validate it's within Benguet/Baguio bounds; if outside, warn and clear
      const within = bounds.contains(new google.maps.LatLng(lat, lng));
      if (!within) {
        alert('Please select a destination within Baguio/Benguet.');
        destinationInput.value = '';
        destLatEl.value = '';
        destLngEl.value = '';
      }
    });

    autocompleteStart.addListener('place_changed', () => {
      const place = autocompleteStart.getPlace();
      if (!place || !place.geometry || !place.geometry.location) return;
      const location = place.geometry.location;
      const lat = location.lat();
      const lng = location.lng();
      startLatEl.value = lat;
      startLngEl.value = lng;

      const within = bounds.contains(new google.maps.LatLng(lat, lng));
      if (!within) {
        alert('Please select a starting location within Baguio/Benguet.');
        startInput.value = '';
        startLatEl.value = '';
        startLngEl.value = '';
      }
    });
  }

  function openModal(){
    if (!mapsLoaded) {
      loadGoogleMaps(() => {
        setupMap();
        mapModal.classList.add('open');
      });
    } else {
      setupMap();
      mapModal.classList.add('open');
    }
  }

  function closeModal(){
    mapModal.classList.remove('open');
  }

  function setupMap(){
    if (!window.google || !google.maps) return;
    geocoder = geocoder || new google.maps.Geocoder();
    const mapEl = document.getElementById('map');
    // If destination has existing coords, use them as center
    const existingLat = pickerContext === 'destination' ? parseFloat(destLatEl.value) : parseFloat(startLatEl.value);
    const existingLng = pickerContext === 'destination' ? parseFloat(destLngEl.value) : parseFloat(startLngEl.value);
    const center = (!isNaN(existingLat) && !isNaN(existingLng)) ? { lat: existingLat, lng: existingLng } : initialCenter;

    map = new google.maps.Map(mapEl, {
      center,
      zoom: 14,
      streetViewControl: false,
      mapTypeControl: false
    });

    marker = new google.maps.Marker({
      position: center,
      map,
      draggable: true
    });

    google.maps.event.addListener(marker, 'dragend', function(){
      const pos = marker.getPosition();
      const lat = pos.lat();
      const lng = pos.lng();
      if (pickerContext === 'destination') {
        destLatEl.value = lat;
        destLngEl.value = lng;
        reverseGeocode(lat, lng, 'destination');
      } else {
        startLatEl.value = lat;
        startLngEl.value = lng;
        reverseGeocode(lat, lng, 'start');
      }
    });
  }

  function reverseGeocode(lat, lng, target){
    if (!geocoder) return;
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results.length) {
        const addr = results[0].formatted_address || results[0].place_id;
        if (target === 'destination') {
          destinationInput.value = addr || destinationInput.value;
        } else {
          startInput.value = addr || startInput.value;
        }
      }
    });
  }

  function resetMarker(){
    if (!marker || !map) return;
    marker.setPosition(initialCenter);
    map.setCenter(initialCenter);
    destLatEl.value = initialCenter.lat;
    destLngEl.value = initialCenter.lng;
    reverseGeocode(initialCenter.lat, initialCenter.lng);
  }

  function hookFormSubmit(){
    const form = document.querySelector('.form-container form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      // Basic validation: destination must be set; allow text fallback if no maps
      const destinationText = data.get('destination');
      const lat = data.get('dest-lat');
      const lng = data.get('dest-lng');
      if (!destinationText) {
        alert('Please provide a destination.');
        return;
      }

      // Validate departure window
      const departureVal = data.get('departure');
      if (!validateDeparture(departureVal)) {
        alert('Please select a valid departure time: tomorrow between 7:30 AM and 8:00 PM, not Sunday.');
        return;
      }

      const payload = {
        startLocation: data.get('start-location'),
        destination: destinationText,
        seats: Number(data.get('seats')),
        cost: Number(data.get('cost')),
        departure: departureVal,
        destLat: lat ? Number(lat) : null,
        destLng: lng ? Number(lng) : null
      };

      try {
        const res = await fetch(`${BASE}/driver-side/includes/create_carpool.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        alert('Carpool created successfully!');
      } catch (err) {
        console.error('Create carpool failed:', err);
        alert(`Failed to create carpool: ${err.message}`);
      }
    });
  }

  // Events
  if (openDestBtn) openDestBtn.addEventListener('click', function(){ pickerContext = 'destination'; openModal(); });
  if (openStartBtn) openStartBtn.addEventListener('click', function(){ pickerContext = 'start'; openModal(); });
  if (closeMapBtn) closeMapBtn.addEventListener('click', closeModal);
  if (useLocationBtn) useLocationBtn.addEventListener('click', function(){
    // Ensure values are set by marker
    const pos = marker && marker.getPosition();
    if (pos) {
      const lat = pos.lat();
      const lng = pos.lng();
      if (pickerContext === 'destination') {
        destLatEl.value = lat;
        destLngEl.value = lng;
        reverseGeocode(lat, lng, 'destination');
      } else {
        startLatEl.value = lat;
        startLngEl.value = lng;
        reverseGeocode(lat, lng, 'start');
      }
    }
    closeModal();
  });
  if (resetMarkerBtn) resetMarkerBtn.addEventListener('click', resetMarker);

  // Initialize maps + autocomplete on focus to avoid early load
  destinationInput && destinationInput.addEventListener('focus', function(){
    loadGoogleMaps(() => {
      initAutocomplete();
    });
  });
  startInput && startInput.addEventListener('focus', function(){
    loadGoogleMaps(() => {
      initAutocomplete();
    });
  });

  // Also try init on DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    hookFormSubmit();
    if (destinationInput || startInput) {
      loadGoogleMaps(() => {
        initAutocomplete();
      });
    }
    setupDepartureConstraints();
  });

  function setupDepartureConstraints(){
    if (!departureInput) return;

    // Earliest allowed date: tomorrow or next non-Sunday day if tomorrow is Sunday
    const earliest = getEarliestAllowedDate();
    const yyyy = earliest.getFullYear();
    const mm = String(earliest.getMonth() + 1).padStart(2, '0');
    const dd = String(earliest.getDate()).padStart(2, '0');
    const minStr = `${yyyy}-${mm}-${dd}T07:30`;

    // Set a max (1 year ahead 20:00) – validation will still block Sundays
    const maxDate = new Date(earliest); maxDate.setFullYear(maxDate.getFullYear() + 1); const maxY = maxDate.getFullYear(); const maxM = String(maxDate.getMonth() + 1).padStart(2,'0'); const maxD = String(maxDate.getDate()).padStart(2,'0');
    const maxStr = `${maxY}-${maxM}-${maxD}T20:00`;

    departureInput.min = minStr;
    departureInput.max = maxStr;

    // Info message if first selectable day was pushed because tomorrow is Sunday
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDay() === 0) { // tomorrow is Sunday, earliest advanced
      const msg = document.createElement('div');
      msg.style.color = '#d00';
      msg.style.marginTop = '6px';
      msg.textContent = `Sunday is not bookable. Earliest available: ${yyyy}-${mm}-${dd} (07:30–20:00).`;
      departureInput.parentElement && departureInput.parentElement.appendChild(msg);
    }

    departureInput.addEventListener('change', function(){
      const val = departureInput.value;
      if (!validateDeparture(val)) {
        alert('Invalid time. Use a future non-Sunday date between 07:30 AM and 08:00 PM.');
        departureInput.value = '';
      }
    });
  }

  function validateDeparture(val){
    if (!val) return false;
    const selected = new Date(val);
    if (isNaN(selected.getTime())) return false;

    const now = new Date();
    // Past or today not allowed
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (selected < todayMidnight) return false; // past
    if (selected.getFullYear() === now.getFullYear() && selected.getMonth() === now.getMonth() && selected.getDate() === now.getDate()) return false; // current day

    // Disallow Sundays
    if (selected.getDay() === 0) return false;

    // Must be after or equal earliest allowed (tomorrow or next non-Sunday)
    const earliest = getEarliestAllowedDate();
    const earliestMidnight = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate());
    const selectedMidnight = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
    if (selectedMidnight < earliestMidnight) return false;

    // Time window 07:30–20:00 local per selected day
    const min = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 7, 30, 0);
    const max = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 20, 0, 0);
    return selected >= min && selected <= max;
  }

  function getEarliestAllowedDate(){
    const d = new Date();
    d.setDate(d.getDate() + 1); // start from tomorrow
    while (d.getDay() === 0) { // skip Sundays
      d.setDate(d.getDate() + 1);
    }
    return d;
  }
})();
