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

  // Extract current marker position using CarmaMapsHelpers conventions
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
    CarmaMapsModal.openModal(loadGoogleMaps, () => { setupMap(); window.__CarmaMapInstance = map; window.__CarmaMarkerInstance = marker; }, bindModalControls, initialCenter);
  }

  // Closes the modal and restores focus to the triggering pin.
  function closeModal() {
    CarmaMapsModal.closeModal();
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

  // Delegate modal control bindings to helpers
  function bindModalControls() {
    CarmaMapsHelpers.bindModalControls(
      'closeMapPicker',
      'useLocation',
      'resetMarker',
      () => getMarkerLatLng(),
      (p, reset) => {
        if (reset) { resetMarker(); return; }
        if (!p) return;
        if (pickerContext === 'destination') {
          destLatEl.value = p.lat; destLngEl.value = p.lng; reverseGeocode(p.lat, p.lng, 'destination');
        } else {
          startLatEl.value = p.lat; startLngEl.value = p.lng; reverseGeocode(p.lat, p.lng, 'start');
        }
      },
      () => closeModal()
    );
    CarmaMapsHelpers.bindEscToClose('mapModal', () => closeModal());
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

  // Toasts delegated to shared UI helpers
  function showMapsError(message) { if (window.CarmaUI && CarmaUI.showMapsError) { CarmaUI.showMapsError(message); } else { console.warn(message); } }
  function showToast(message) { if (window.CarmaUI && CarmaUI.showToast) { CarmaUI.showToast(message); } }

  // POST handler for the form: builds JSON payload including coords and sends to backend.
  // Reads values directly from DOM when FormData names aren't present.
  // Formats the second slot as a display string and keeps ISO from the first slot.
  function hookFormSubmit() {
    const form = document.querySelector('.form-container form');
    if (!form || !window.CarmaCarpoolSubmit) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = CarmaCarpoolSubmit.buildPayload(BASE, startSlotInput, endSlotInput);
      if (!payload) return;
      try { await CarmaCarpoolSubmit.submitCarpool(BASE, payload); }
      catch (err) { console.error('Create carpool failed:', err); alert(`Failed to create carpool: ${err.message}`); }
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
      // Benguet bounds enforcement before applying
      try {
        const bbounds = (window.CarmaMapsHelpers && CarmaMapsHelpers.getBaguioBenguetBounds) ? CarmaMapsHelpers.getBaguioBenguetBounds() : null;
        if (bbounds && window.google && google.maps) {
          const within = bbounds.contains(new google.maps.LatLng(p.lat, p.lng));
          if (!within) {
            showMapsError('Please select a location within Benguet.');
            return;
          }
        }
      } catch (_) {}
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
