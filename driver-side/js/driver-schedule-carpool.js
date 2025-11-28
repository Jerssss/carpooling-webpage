// Driver Schedule Carpool interactions
// Requirements: Google Maps JavaScript API with Places library
// API Key should be set in window.GMAPS_API_KEY or replace placeholder below

(function(){
  const BASE = '/9467_it312-teamarc_midtermproject';
  const apiKey = window.GMAPS_API_KEY || 'GOOGLE_MAPS_API_KEY_HERE'; // TODO: replace

  const destinationInput = document.getElementById('destination');
  const openMapBtn = document.getElementById('openMapPicker');
  const mapModal = document.getElementById('mapModal');
  const closeMapBtn = document.getElementById('closeMapPicker');
  const useLocationBtn = document.getElementById('useLocation');
  const resetMarkerBtn = document.getElementById('resetMarker');
  const destLatEl = document.getElementById('dest-lat');
  const destLngEl = document.getElementById('dest-lng');

  let mapsLoaded = false;
  let autocomplete = null;
  let map = null;
  let marker = null;
  let geocoder = null;
  let initialCenter = { lat: 16.4023, lng: 120.5960 }; // Baguio City center

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
    autocomplete = new google.maps.places.Autocomplete(destinationInput, {
      fields: ['place_id', 'geometry', 'name', 'formatted_address'],
      types: ['geocode']
    });
    // Bias results to Baguio/Benguet via componentRestrictions if available
    try {
      if (autocomplete.setComponentRestrictions) {
        autocomplete.setComponentRestrictions({ country: ['ph'] });
      }
    } catch(e) {}

    // Additional manual bounds around Baguio/Benguet
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(16.2000, 120.5000), // SW approx Benguet
      new google.maps.LatLng(16.6000, 121.0000)  // NE approx
    );
    autocomplete.setBounds(bounds);
    autocomplete.setOptions({ strictBounds: false });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
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
    const existingLat = parseFloat(destLatEl.value);
    const existingLng = parseFloat(destLngEl.value);
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
      destLatEl.value = pos.lat();
      destLngEl.value = pos.lng();
      reverseGeocode(pos.lat(), pos.lng());
    });
  }

  function reverseGeocode(lat, lng){
    if (!geocoder) return;
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results.length) {
        // Prefer formatted_address
        destinationInput.value = results[0].formatted_address || results[0].place_id || destinationInput.value;
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

      const payload = {
        startLocation: data.get('start-location'),
        destination: destinationText,
        seats: Number(data.get('seats')),
        cost: Number(data.get('cost')),
        departure: data.get('departure'),
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
  if (openMapBtn) openMapBtn.addEventListener('click', openModal);
  if (closeMapBtn) closeMapBtn.addEventListener('click', closeModal);
  if (useLocationBtn) useLocationBtn.addEventListener('click', function(){
    // Ensure values are set by marker
    if (!destLatEl.value || !destLngEl.value) {
      const pos = marker && marker.getPosition();
      if (pos) {
        destLatEl.value = pos.lat();
        destLngEl.value = pos.lng();
        reverseGeocode(pos.lat(), pos.lng());
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

  // Also try init on DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    hookFormSubmit();
    if (destinationInput) {
      loadGoogleMaps(() => {
        initAutocomplete();
      });
    }
  });
})();
