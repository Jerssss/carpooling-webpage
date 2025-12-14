// Driver Schedule Carpool interactions
// Overview:
// - "Start" and "Destination" fields with Google Places Autocomplete
// - Adds a map picker modal with a draggable pin to fine-tune locations
// - Keeps hidden lat/lng fields synchronized with text inputs via geocoding
// - Validates departure date/time per business rules (no sundays, future only, 07:30am–8:00pm)
// Requirements: Google Maps JavaScript API with Places library + a valid billing account

(function () {
  const BASE = '/9467_it312-teamarc_midtermproject';
  const apiKey = 'ENV_API_KEY'; // API KEY FROM JERS, PLEASE DON'T LEAK
  const MAP_ID = 'ENV_MAP_ID_KEY'; // MAP ID FROM JERS, PLEASE DON'T LEAK
  if (!window.GMAPS_MAP_ID) { window.GMAPS_MAP_ID = MAP_ID; }

  // Form + UI elements: inputs, buttons, and hidden coord fields
  const destinationInput = document.getElementById('destination');
  const openDestBtn = document.getElementById('openDestMapPicker');
  const startInput = document.getElementById('start-location');
  const openStartBtn = document.getElementById('openStartMapPicker');
  const startSlotInput = document.getElementById('carpool-start-time');
  const endSlotInput = document.getElementById('carpool-departure-time');
  const mapModal = document.getElementById('mapModal');
  const closeMapBtn = document.getElementById('closeMapPicker');
  const useLocationBtn = document.getElementById('useLocation');
  const resetMarkerBtn = document.getElementById('resetMarker');
  const destLatEl = document.getElementById('dest-lat');
  const destLngEl = document.getElementById('dest-lng');
  const startLatEl = document.getElementById('start-lat');
  const startLngEl = document.getElementById('start-lng');

  // Runtime map state: toggles and instances created lazily
  let mapsLoaded = false;
  let autocompleteDest = null;
  let autocompleteStart = null;
  let map = null;
  let marker = null; 
  let geocoder = null;
  let initialCenter = { lat: 16.4023, lng: 120.5960 }; // Baguio City center default
  let pickerContext = 'destination';

  // Safely extract {lat, lng} from AdvancedMarkerElement or classic markers
  // AdvancedMarkerElement exposes a plain position object (lat/lng) or getter functions.
  // This normalizes both cases and returns a simple {lat, lng}.
  function getMarkerLatLng() {
    if (!marker || !marker.position) return null;
    const pos = marker.position;
    const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
    const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { lat, lng };
  }

  // Dynamically loads the Google Maps script (Places lib included).
  // Lazy-load to keep page fast; only fetch when needed.
  function loadGoogleMaps(cb) {
    if (mapsLoaded) return cb();
    CarmaMapsHelpers.loadGoogleMaps(apiKey, function(){ mapsLoaded = true; cb(); });
  }

  // Wire up Places Autocomplete for both inputs; bias results to Baguio/Benguet.
  // Uses componentRestrictions and manual bounds to keep results relevant.
  function initAutocomplete() {
    if (!window.CarmaMapsModal) return;
    const result = CarmaMapsModal.initAutocomplete(destinationInput, startInput, destLatEl, destLngEl, startLatEl, startLngEl);
    autocompleteDest = result.autocompleteDest;
    autocompleteStart = result.autocompleteStart;
  }

  // Opens the map modal and initializes/centers the map + marker for current field context.
  // Keeps focus management simple to avoid aria warnings.
  function openModal() {
    const modalEl = document.getElementById('mapModal');
    if (!modalEl) {
      showMapsError('Map modal not found. Ensure #mapModal exists in the page.');
      return;
    }
    const openAndFocus = () => {
      modalEl.classList.add('open');
      modalEl.setAttribute('aria-hidden', 'false');
      // Bind controls every time modal opens in case DOM was injected late
      bindModalControls();
      const focusTarget = document.getElementById('useLocation') || modalEl;
      focusTarget && focusTarget.focus && focusTarget.focus();
      // If the map was initialized while hidden, force a resize and recenter
      ensureMapReadyAfterOpen();
    };
    if (!mapsLoaded) {
      loadGoogleMaps(() => {
        setupMap();
        openAndFocus();
      });
    } else {
      setupMap();
      openAndFocus();
    }
  }

  // Closes the modal and restores focus to the triggering pin.
  function closeModal() {
    const modalEl = document.getElementById('mapModal');
    if (modalEl) {
      modalEl.classList.remove('open');
      modalEl.setAttribute('aria-hidden', 'true');
    }
    // Return focus to the triggering button
    const returnTarget = pickerContext === 'destination' ? openDestBtn : openStartBtn;
    returnTarget && returnTarget.focus && returnTarget.focus();
  }

  // Delegated map setup via CarmaMapsModal
  function setupMap() {
    if (!window.CarmaMapsModal) return;
    const result = CarmaMapsModal.setupMap({
      MAP_ID,
      initialCenter,
      pickerContext,
      destinationInput,
      startInput,
      destLatEl, destLngEl,
      startLatEl, startLngEl,
      showMapsError,
      setMarkerPosition,
      reverseGeocode,
      getMarkerLatLng: function(localMarker){
        const mk = localMarker || marker;
        if (!mk || !mk.position) return null;
        const pos = mk.position;
        const lat = typeof pos.lat==='function'?pos.lat():pos.lat;
        const lng = typeof pos.lng==='function'?pos.lng():pos.lng;
        if (typeof lat!=='number'||typeof lng!=='number') return null;
        return {lat,lng};
      }
    });
    map = result.map; marker = result.marker; geocoder = result.geocoder;
  }

  // Ensure map is properly rendered after modal becomes visible
  function ensureMapReadyAfterOpen() {
    try {
      const mapEl = document.getElementById('map');
      if (!mapEl) return;
      CarmaMapsHelpers.ensureMapContainer(mapEl);
      CarmaMapsHelpers.triggerResizeAndCenter(map, marker, initialCenter);
    } catch (e) {
      // no-op
    }
  }

  // Safely (re)bind modal control buttons to handlers each time it opens
  function bindModalControls() {
    const closeBtn = document.getElementById('closeMapPicker');
    const useBtn = document.getElementById('useLocation');
    const resetBtn = document.getElementById('resetMarker');
    if (closeBtn) {
      closeBtn.onclick = (ev) => { ev.preventDefault(); closeModal(); };
    }
    if (useBtn) {
      useBtn.onclick = (ev) => {
        ev.preventDefault();
        const p = getMarkerLatLng();
        if (p) {
          if (pickerContext === 'destination') {
            destLatEl.value = p.lat;
            destLngEl.value = p.lng;
            reverseGeocode(p.lat, p.lng, 'destination');
          } else {
            startLatEl.value = p.lat;
            startLngEl.value = p.lng;
            reverseGeocode(p.lat, p.lng, 'start');
          }
          showToast('Location selected.');
          closeModal();
        } else {
          showMapsError('Please move the pin to choose a location.');
        }
      };
    }
    if (resetBtn) {
      resetBtn.onclick = (ev) => { ev.preventDefault(); resetMarker(); };
    }

    // Keyboard: ESC to close when modal is open
    document.addEventListener('keydown', function onKey(e) {
      const modalEl = document.getElementById('mapModal');
      if (!modalEl || !modalEl.classList.contains('open')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    }, { once: true });
  }

  // Reverse-geocode a coordinate to a formatted address and write to the proper input.
  function reverseGeocode(lat, lng, target) {
    if (!geocoder) return;
    CarmaMapsHelpers.reverseGeocode(geocoder, lat, lng, function(addr){
      if (target === 'destination') { destinationInput.value = addr || destinationInput.value; }
      else { startInput.value = addr || startInput.value; }
    });
  }

  // Reset the marker and map center to the default initial center (Baguio).
  function resetMarker() {
    if (!marker || !map) return;
    if (marker && marker.position !== undefined) {
      marker.position = initialCenter;
    } else if (marker && marker.setPosition) {
      marker.setPosition(initialCenter);
    }
    map.setCenter(initialCenter);
    if (pickerContext === 'destination') {
      destLatEl.value = initialCenter.lat;
      destLngEl.value = initialCenter.lng;
      reverseGeocode(initialCenter.lat, initialCenter.lng, 'destination');
    } else {
      startLatEl.value = initialCenter.lat;
      startLngEl.value = initialCenter.lng;
      reverseGeocode(initialCenter.lat, initialCenter.lng, 'start');
    }
  }

  // Utility to move the marker and recenter the map.
  function setMarkerPosition(lat, lng) {
    if (!marker || !map) return;
    CarmaMapsHelpers.setMarkerPosition(map, marker, lat, lng);
  }

  // In-page toast for showing Maps-related diagnostics.
  function showMapsError(message) {
    try {
      const container = document.body;
      const div = document.createElement('div');
      div.className = 'toast-warning';
      div.textContent = message;
      container.appendChild(div);
      setTimeout(() => { div.remove(); }, 8000);
    } catch (e) {
      console.warn(message);
    }
  }

  // Success toast used for confirmations (short duration, green theme)
  function showToast(message) {
    try {
      const container = document.body;
      const div = document.createElement('div');
      div.className = 'toast';
      div.textContent = message;
      container.appendChild(div);
      setTimeout(() => { div.remove(); }, 2500);
    } catch (e) {
      // fallback
    }
  }

  // POST handler for the form: builds JSON payload including coords and sends to backend.
  // Reads values directly from DOM when FormData names aren't present.
  // Formats the second slot as a display string and keeps ISO from the first slot.
  function hookFormSubmit() {
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

      // Validate time slots
      // First slot: future, not Sunday, within 07:30–20:00
      // Second slot: same day, later than first, min 10-minute gap
      const startVal = startSlotInput && startSlotInput.value;
      const endVal = endSlotInput && endSlotInput.value;
      if (!(window.CarmaTime && CarmaTime.validateDeparture(startVal))) {
        alert('Please select a valid first time slot: future non-Sunday between 7:30 AM and 8:00 PM.');
        return;
      }
      if (!endVal) {
        alert('Please select the second time slot.');
        return;
      }
      if (!(window.CarmaTime && CarmaTime.validateSecondSlot(startVal, endVal, 10))) {
        alert('Second slot must be later, same day, and at least 10 minutes after the first.');
        return;
      }
      const departureDisplay = (window.CarmaTime && CarmaTime.buildDepartureDisplay(startVal, endVal)) || '';

      const payload = {
        // Prefer direct DOM values when available (IDs are present); fallback to FormData
        startLocation: document.getElementById('start-location') ? document.getElementById('start-location').value : data.get('start-location'),
        destination: destinationText,
        seats: (function(){ const el = document.getElementById('seats'); return el ? Number(el.value) : Number(data.get('seats')); })(),
        cost: (function(){ const el = document.getElementById('cost'); return el ? Number(el.value) : Number(data.get('cost')); })(),
        // Send ISO from the first slot; backend uses this for date/overlap checks
        departure: startVal,
        departureTimeDisplay: departureDisplay,
        destLat: (function(){ const el = document.getElementById('dest-lat'); return el && el.value ? Number(el.value) : (lat ? Number(lat) : null); })(),
        destLng: (function(){ const el = document.getElementById('dest-lng'); return el && el.value ? Number(el.value) : (lng ? Number(lng) : null); })()
      };

      try {
        // JSON POST with credentials included for session-bound endpoints
        const res = await fetch(`${BASE}/driver-side/includes/create_carpool.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        alert('Carpool created successfully!');
        window.location.href = `${BASE}/driver-side/driver-landing.html`;
      } catch (err) {
        console.error('Create carpool failed:', err);
        alert(`Failed to create carpool: ${err.message}`);
      }
    });
  }

  // Events
  if (openDestBtn) openDestBtn.addEventListener('click', function () { pickerContext = 'destination'; openModal(); });
  if (openStartBtn) openStartBtn.addEventListener('click', function () { pickerContext = 'start'; openModal(); });
  if (closeMapBtn) closeMapBtn.addEventListener('click', closeModal);
  if (useLocationBtn) useLocationBtn.addEventListener('click', function () {
    // Ensure values are set by marker (supports AdvancedMarkerElement)
    const p = getMarkerLatLng();
    if (p) {
      if (pickerContext === 'destination') {
        destLatEl.value = p.lat;
        destLngEl.value = p.lng;
        reverseGeocode(p.lat, p.lng, 'destination');
      } else {
        startLatEl.value = p.lat;
        startLngEl.value = p.lng;
        reverseGeocode(p.lat, p.lng, 'start');
      }
      showToast('Location selected.');
      closeModal();
    } else {
      showMapsError('Please move the pin to choose a location.');
    }
  });
  if (resetMarkerBtn) resetMarkerBtn.addEventListener('click', resetMarker);

  // Initialize maps + autocomplete on focus to avoid early load
  destinationInput && destinationInput.addEventListener('focus', function () {
    loadGoogleMaps(() => {
      initAutocomplete();
    });
  });
  startInput && startInput.addEventListener('focus', function () {
    loadGoogleMaps(() => {
      initAutocomplete();
    });
  });

  // Also try init on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    hookFormSubmit();
    if (destinationInput || startInput) {
      loadGoogleMaps(() => {
        initAutocomplete();
      });
    }
    if (window.CarmaTime) {
      CarmaTime.setupTimePairConstraints(startSlotInput, endSlotInput);
    }
  });
})();
