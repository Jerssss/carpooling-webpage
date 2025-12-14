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
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = function () { mapsLoaded = true; cb(); };
    script.onerror = function () {
      console.error('Failed to load Google Maps API');
      showMapsError('Failed to load Google Maps API. Check network, ad blockers, and API key.');
    };
    document.head.appendChild(script);
  }

  // Wire up Places Autocomplete for both inputs; bias results to Baguio/Benguet.
  // Uses componentRestrictions and manual bounds to keep results relevant.
  function initAutocomplete() {
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
    } catch (e) { }

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
      // When a place is selected, sync hidden lat/lng and guard against out-of-bounds picks
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
      // Mirror of destination logic for the start location
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

  // Creates the map and the draggable marker. If the field already has lat/lng,
  // centers/places the marker there; otherwise, geocodes the typed text to seed the pin.
  function setupMap() {
    if (!window.google || !google.maps) return;
    if (google.maps.importLibrary) {
      // Try new loader libs, but don't rely solely on them.
      google.maps.importLibrary('maps').catch(() => { });
      google.maps.importLibrary('marker').catch(() => { });
    }
    geocoder = geocoder || new google.maps.Geocoder();
    const mapEl = document.getElementById('map');
    if (!mapEl) {
      showMapsError('Map container not found. Ensure an element with id="map" exists in the modal.');
      return;
    }
    mapEl.innerHTML = '';
    // Ensure the map container has a visible height
    if (!mapEl.style.height) {
      // Fallback height if CSS didn't set it
      mapEl.style.height = '60vh';
    }
    // If destination has existing coords, use them as center
    const existingLat = pickerContext === 'destination' ? parseFloat(destLatEl.value) : parseFloat(startLatEl.value);
    const existingLng = pickerContext === 'destination' ? parseFloat(destLngEl.value) : parseFloat(startLngEl.value);
    const center = (!isNaN(existingLat) && !isNaN(existingLng)) ? { lat: existingLat, lng: existingLng } : initialCenter;

    const mapOptions = {
      center,
      zoom: 14,
      streetViewControl: false,
      mapTypeControl: false
    };
    if (MAP_ID) { mapOptions.mapId = MAP_ID; }
    map = new google.maps.Map(mapEl, mapOptions);
    if (!map) {
      showMapsError('Google Maps not activated for this project. Enable "Maps JavaScript API" and "Places API" in Google Cloud Console.');
      return;
    }

    // Use AdvancedMarkerElement (no classic Marker fallback per project decision).
    // Advanced markers need a Map ID with vector basemap enabled.
    if (!(google.maps.marker && google.maps.marker.AdvancedMarkerElement)) {
      showMapsError('Advanced Markers unavailable. Provide a valid Map ID (window.GMAPS_MAP_ID) and ensure billing/APIs are enabled.');
      return;
    }
    marker = new google.maps.marker.AdvancedMarkerElement({
      position: center,
      map,
      gmpDraggable: true
    });

    // Update hidden lat/lng + input text when the user drags the pin.
    // Keeps text inputs in sync via reverse geocoding after a drag.
    marker.addListener('dragend', function () {
      const p = getMarkerLatLng();
      if (!p) return;
      if (pickerContext === 'destination') {
        destLatEl.value = p.lat;
        destLngEl.value = p.lng;
        reverseGeocode(p.lat, p.lng, 'destination');
      } else {
        startLatEl.value = p.lat;
        startLngEl.value = p.lng;
        reverseGeocode(p.lat, p.lng, 'start');
      }
    });

    // If we don't have coordinates yet but there is typed text, geocode it to place the pin
    // This helps when users type an address first and open the picker later.
    const typedValue = pickerContext === 'destination' ? (destinationInput && destinationInput.value) : (startInput && startInput.value);
    const hasCoords = !isNaN(existingLat) && !isNaN(existingLng);
    if (!hasCoords && typedValue && typedValue.trim().length > 0) {
      const bbounds = getBaguioBenguetBounds();
      geocoder.geocode({ address: typedValue, bounds: bbounds, region: 'PH' }, (results, status) => {
        if (status === 'OK' && results && results.length) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          setMarkerPosition(lat, lng);
          if (pickerContext === 'destination') {
            destLatEl.value = lat; destLngEl.value = lng;
            // Normalize text to formatted address
            destinationInput.value = results[0].formatted_address || destinationInput.value;
          } else {
            startLatEl.value = lat; startLngEl.value = lng;
            startInput.value = results[0].formatted_address || startInput.value;
          }
        }
      });
    } else if (hasCoords) {
      // Ensure marker snaps to saved coordinates
      setMarkerPosition(existingLat, existingLng);
    }
  }

  // Ensure map is properly rendered after modal becomes visible
  function ensureMapReadyAfterOpen() {
    try {
      const mapEl = document.getElementById('map');
      if (!mapEl) return;
      // If element has zero height/width, apply a fallback height
      const rect = mapEl.getBoundingClientRect();
      if (rect.height < 20) {
        mapEl.style.height = mapEl.style.height || '60vh';
      }
      if (window.google && google.maps && map) {
        if (google.maps.event && google.maps.event.trigger) {
          google.maps.event.trigger(map, 'resize');
        }
        // Recenter after resize to maintain expected view
        const p = getMarkerLatLng() || initialCenter;
        map.setCenter(p);
      }
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
    const pos = { lat, lng };
    if (marker.position !== undefined) {
      marker.position = pos;
    } else if (marker.setPosition) {
      marker.setPosition(new google.maps.LatLng(lat, lng));
    }
    map.setCenter(pos);
  }

  // Returns an approximate bounding box for Baguio/Benguet to bias searches/geocoding.
  function getBaguioBenguetBounds() {
    if (!window.google || !google.maps) return null;
    return new google.maps.LatLngBounds(
      new google.maps.LatLng(16.2000, 120.5000),
      new google.maps.LatLng(16.6000, 121.0000)
    );
  }

  // Lightweight in-page toast for showing Maps-related diagnostics.
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
      if (!validateDeparture(startVal)) {
        alert('Please select a valid first time slot: future non-Sunday between 7:30 AM and 8:00 PM.');
        return;
      }
      if (!endVal) {
        alert('Please select the second time slot.');
        return;
      }
      const s = new Date(startVal);
      const e2 = new Date(endVal);
      if (e2 <= s || (e2.getTime() - s.getTime()) < 10 * 60 * 1000) {
        alert('Second slot must be later and at least 10 minutes after the first.');
        return;
      }
      // Display uses local 12-hour format: "HH:MM AM/PM - HH:MM AM/PM"
      const fmt = (d) => {
        const hh = d.getHours();
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ampm = hh >= 12 ? 'PM' : 'AM';
        const hour12 = ((hh + 11) % 12) + 1;
        return `${hour12}:${mm} ${ampm}`;
      };
      const departureDisplay = `${fmt(s)} - ${fmt(e2)}`;

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
    setupTimePairConstraints();
  });

  // Applies min/max and change validation for the departure datetime input.
  // This couples the two slots: same day, order, and minimum gap.
  function setupTimePairConstraints() {
    if (!startSlotInput || !endSlotInput) return;

    // Earliest allowed date: tomorrow or next non-Sunday day if tomorrow is Sunday
    const earliest = getEarliestAllowedDate();
    const yyyy = earliest.getFullYear();
    const mm = String(earliest.getMonth() + 1).padStart(2, '0');
    const dd = String(earliest.getDate()).padStart(2, '0');
    const minStr = `${yyyy}-${mm}-${dd}T07:30`;

    // Set a max (1 year ahead 20:00) – validation will still block Sundays
    const maxDate = new Date(earliest); maxDate.setFullYear(maxDate.getFullYear() + 1); const maxY = maxDate.getFullYear(); const maxM = String(maxDate.getMonth() + 1).padStart(2, '0'); const maxD = String(maxDate.getDate()).padStart(2, '0');
    const maxStr = `${maxY}-${maxM}-${maxD}T20:00`;

    startSlotInput.min = minStr;
    startSlotInput.max = maxStr;

    // Info message if first selectable day was pushed because tomorrow is Sunday
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDay() === 0) { // tomorrow is Sunday, earliest advanced
      const msg = document.createElement('div');
      msg.style.color = '#d00';
      msg.style.marginTop = '6px';
      msg.textContent = `Sunday is not bookable. Earliest available: ${yyyy}-${mm}-${dd} (07:30–20:00).`;
      startSlotInput.parentElement && startSlotInput.parentElement.appendChild(msg);
    }

    function lockEndToStartDate() {
      // Locks second slot's min/max to the first slot's day
      const sVal = startSlotInput.value;
      if (!sVal) return;
      const s = new Date(sVal);
      if (isNaN(s.getTime())) return;
      const y = s.getFullYear();
      const m = String(s.getMonth() + 1).padStart(2, '0');
      const d0 = String(s.getDate()).padStart(2, '0');
      endSlotInput.min = `${y}-${m}-${d0}T07:40`;
      endSlotInput.max = `${y}-${m}-${d0}T20:00`;
      if (endSlotInput.value) {
        const e = new Date(endSlotInput.value);
        if (e.getFullYear() !== y || e.getMonth() !== s.getMonth() || e.getDate() !== s.getDate()) {
          alert('Second time slot date is locked to the first time slot.');
          endSlotInput.value = '';
        }
      }
    }

    lockEndToStartDate();

    startSlotInput.addEventListener('change', function () {
      const val = startSlotInput.value;
      if (!validateDeparture(val)) {
        alert('Invalid start time. Choose a future non-Sunday between 07:30 and 20:00.');
        startSlotInput.value = '';
        endSlotInput.value = '';
        return;
      }
      lockEndToStartDate();
      if (endSlotInput.value) {
        // Re-check ordering and minimum gap if second slot is already chosen
        const s = new Date(startSlotInput.value);
        const e = new Date(endSlotInput.value);
        if (e <= s) {
          alert('Second time slot must be later than the first.');
          endSlotInput.value = '';
        } else {
          const diffMs = e.getTime() - s.getTime();
          if (diffMs < 10 * 60 * 1000) {
            alert('There must be at least a 10-minute gap between the two time slots.');
            endSlotInput.value = '';
          }
        }
      }
    });

    endSlotInput.addEventListener('change', function () {
      if (!startSlotInput.value) {
        alert('Please select the first time slot before the second.');
        endSlotInput.value = '';
        return;
      }
      const s = new Date(startSlotInput.value);
      const e = new Date(endSlotInput.value);
      if (e.getFullYear() !== s.getFullYear() || e.getMonth() !== s.getMonth() || e.getDate() !== s.getDate()) {
        alert('Second time slot date is locked to the first time slot.');
        endSlotInput.value = '';
        return;
      }
      if (e <= s) {
        alert('Second time slot must be later than the first.');
        endSlotInput.value = '';
        return;
      }
      const diffMs = e.getTime() - s.getTime();
      if (diffMs < 10 * 60 * 1000) {
        alert('There must be at least a 10-minute gap between the two time slots.');
        endSlotInput.value = '';
        return;
      }
      const okStart = validateDeparture(startSlotInput.value);
      if (!okStart) {
        alert('Invalid first time slot.');
        startSlotInput.value = '';
        endSlotInput.value = '';
        return;
      }
      // Bound check for second slot on the same day
      const min = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 7, 30, 0);
      const max = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 20, 0, 0);
      if (!(e >= min && e <= max)) {
        alert('Second time slot must be between 07:30 and 20:00.');
        endSlotInput.value = '';
      }
    });
  }

  // Ensures selected datetime is a future non-Sunday and within 07:30–20:00 window.
  // Also disallows selecting "today" to keep lead time.
  function validateDeparture(val) {
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

  // Computes the earliest selectable date (tomorrow or next non-Sunday if tomorrow is Sunday).
  // Simple loop to skip Sundays; returns a Date positioned at midnight.
  function getEarliestAllowedDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1); // start from tomorrow
    while (d.getDay() === 0) { // skip Sundays
      d.setDate(d.getDate() + 1);
    }
    return d;
  }
})();
