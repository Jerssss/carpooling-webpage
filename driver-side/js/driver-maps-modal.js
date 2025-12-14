// Driver Maps Modal Helpers
// Autocomplete and map setup
(function(){
  function initAutocomplete(destinationInput, startInput, destLatEl, destLngEl, startLatEl, startLngEl) {
    if (!window.google || !google.maps || !google.maps.places) return { autocompleteDest: null, autocompleteStart: null };
    const autocompleteDest = new google.maps.places.Autocomplete(destinationInput, {
      fields: ['place_id', 'geometry', 'name', 'formatted_address'],
      types: ['geocode']
    });
    const autocompleteStart = new google.maps.places.Autocomplete(startInput, {
      fields: ['place_id', 'geometry', 'name', 'formatted_address'],
      types: ['geocode']
    });
    try { if (autocompleteDest.setComponentRestrictions) { autocompleteDest.setComponentRestrictions({ country: ['ph'] }); } } catch(e) {}

    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(16.2000, 120.5000),
      new google.maps.LatLng(16.6000, 121.0000)
    );
    autocompleteDest.setBounds(bounds); autocompleteDest.setOptions({ strictBounds: false });
    autocompleteStart.setBounds(bounds); autocompleteStart.setOptions({ strictBounds: false });

    autocompleteDest.addListener('place_changed', () => {
      const place = autocompleteDest.getPlace();
      if (!place || !place.geometry || !place.geometry.location) return;
      const loc = place.geometry.location; const lat = loc.lat(); const lng = loc.lng();
      destLatEl.value = lat; destLngEl.value = lng;
      const within = bounds.contains(new google.maps.LatLng(lat, lng));
      if (!within) { alert('Please select a destination within Baguio/Benguet.'); destinationInput.value=''; destLatEl.value=''; destLngEl.value=''; }
    });

    autocompleteStart.addListener('place_changed', () => {
      const place = autocompleteStart.getPlace();
      if (!place || !place.geometry || !place.geometry.location) return;
      const loc = place.geometry.location; const lat = loc.lat(); const lng = loc.lng();
      startLatEl.value = lat; startLngEl.value = lng;
      const within = bounds.contains(new google.maps.LatLng(lat, lng));
      if (!within) { alert('Please select a starting location within Baguio/Benguet.'); startInput.value=''; startLatEl.value=''; startLngEl.value=''; }
    });

    return { autocompleteDest, autocompleteStart };
  }

  function setupMap(opts) {
    const {
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
      getMarkerLatLng
    } = opts;

    if (!window.google || !google.maps) return { map: null, marker: null, geocoder: null };
    if (google.maps.importLibrary) { google.maps.importLibrary('maps').catch(()=>{}); google.maps.importLibrary('marker').catch(()=>{}); }
    const geocoder = new google.maps.Geocoder();
    const mapEl = document.getElementById('map');
    if (!mapEl) { showMapsError && showMapsError('Map container not found. Ensure an element with id="map" exists in the modal.'); return { map: null, marker: null, geocoder: null }; }
    mapEl.innerHTML='';
    if (window.CarmaMapsHelpers && CarmaMapsHelpers.ensureMapContainer) { CarmaMapsHelpers.ensureMapContainer(mapEl); }

    const existingLat = pickerContext === 'destination' ? parseFloat(destLatEl.value) : parseFloat(startLatEl.value);
    const existingLng = pickerContext === 'destination' ? parseFloat(destLngEl.value) : parseFloat(startLngEl.value);
    const center = (!isNaN(existingLat) && !isNaN(existingLng)) ? { lat: existingLat, lng: existingLng } : initialCenter;

    const mapOptions = { center, zoom: 14, streetViewControl: false, mapTypeControl: false };
    if (MAP_ID) { mapOptions.mapId = MAP_ID; }
    const map = new google.maps.Map(mapEl, mapOptions);
    if (!map) { showMapsError && showMapsError('Google Maps not activated for this project. Enable "Maps JavaScript API" and "Places API" in Google Cloud Console.'); return { map: null, marker: null, geocoder: null }; }

    if (!(google.maps.marker && google.maps.marker.AdvancedMarkerElement)) { showMapsError && showMapsError('Advanced Markers unavailable. Provide a valid Map ID (window.GMAPS_MAP_ID) and ensure billing/APIs are enabled.'); return { map: null, marker: null, geocoder: null }; }
    const marker = new google.maps.marker.AdvancedMarkerElement({ position: center, map, gmpDraggable: true });

    marker.addListener('dragend', function(){
      const p = getMarkerLatLng && getMarkerLatLng(marker);
      if (!p) return;
      if (pickerContext === 'destination') { destLatEl.value = p.lat; destLngEl.value = p.lng; reverseGeocode && reverseGeocode(p.lat, p.lng, 'destination'); }
      else { startLatEl.value = p.lat; startLngEl.value = p.lng; reverseGeocode && reverseGeocode(p.lat, p.lng, 'start'); }
    });

    const typedValue = pickerContext === 'destination' ? (destinationInput && destinationInput.value) : (startInput && startInput.value);
    const hasCoords = !isNaN(existingLat) && !isNaN(existingLng);
    if (!hasCoords && typedValue && typedValue.trim().length > 0) {
      const bbounds = (window.CarmaMapsHelpers && CarmaMapsHelpers.getBaguioBenguetBounds) ? CarmaMapsHelpers.getBaguioBenguetBounds() : null;
      geocoder.geocode({ address: typedValue, bounds: bbounds, region: 'PH' }, (results, status) => {
        if (status === 'OK' && results && results.length) {
          const loc = results[0].geometry.location; const lat = loc.lat(); const lng = loc.lng();
          if (window.CarmaMapsHelpers && CarmaMapsHelpers.setMarkerPosition) { CarmaMapsHelpers.setMarkerPosition(map, marker, lat, lng); }
          else { setMarkerPosition && setMarkerPosition(lat, lng); }
          if (pickerContext === 'destination') { destLatEl.value = lat; destLngEl.value = lng; destinationInput.value = results[0].formatted_address || destinationInput.value; }
          else { startLatEl.value = lat; startLngEl.value = lng; startInput.value = results[0].formatted_address || startInput.value; }
        }
      });
    } else if (hasCoords) {
      if (window.CarmaMapsHelpers && CarmaMapsHelpers.setMarkerPosition) { CarmaMapsHelpers.setMarkerPosition(map, marker, existingLat, existingLng); }
      else { setMarkerPosition && setMarkerPosition(existingLat, existingLng); }
    }

    return { map, marker, geocoder };
  }

  window.CarmaMapsModal = { initAutocomplete, setupMap };
})();
