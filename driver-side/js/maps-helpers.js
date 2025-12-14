// Map helper utilities
// Returns an approximate bounding box for Baguio/Benguet to bias searches/geocoding.
// Exposes both a namespaced API and top-level fallbacks for existing code.
(function(){
  function getBaguioBenguetBounds() {
    if (!window.google || !google.maps) return null;
    return new google.maps.LatLngBounds(
      new google.maps.LatLng(16.2000, 120.5000),
      new google.maps.LatLng(16.6000, 121.0000)
    );
  }

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

  // Ensure map container is visible height; return final element
  function ensureMapContainer(mapEl) {
    if (!mapEl) return null;
    if (!mapEl.style.height || mapEl.getBoundingClientRect().height < 20) {
      mapEl.style.height = mapEl.style.height || '60vh';
    }
    return mapEl;
  }

  // Trigger map resize after modal open and recenter
  function triggerResizeAndCenter(map, markerOrCenter, fallbackCenter) {
    try {
      if (!map || !window.google || !google.maps) return;
      if (google.maps.event && google.maps.event.trigger) {
        google.maps.event.trigger(map, 'resize');
      }
      let center = fallbackCenter;
      if (markerOrCenter) {
        if (markerOrCenter.position) {
          const pos = markerOrCenter.position;
          const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
          const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
          if (typeof lat === 'number' && typeof lng === 'number') center = { lat, lng };
        } else if (markerOrCenter.lat && markerOrCenter.lng) {
          center = markerOrCenter;
        }
      }
      if (center) map.setCenter(center);
    } catch(e) {}
  }

  // Reverse geocode helper
  function reverseGeocode(geocoder, lat, lng, writeToInput) {
    if (!geocoder || !window.google || !google.maps) return;
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results.length && writeToInput) {
        const addr = results[0].formatted_address || results[0].place_id;
        writeToInput(addr);
      }
    });
  }

  // Marker move + recenter
  function setMarkerPosition(map, marker, lat, lng) {
    if (!marker || !map || !window.google || !google.maps) return;
    const pos = { lat, lng };
    if (marker.position !== undefined) {
      marker.position = pos;
    } else if (marker.setPosition) {
      marker.setPosition(new google.maps.LatLng(lat, lng));
    }
    map.setCenter(pos);
  }

  // Load Google Maps dynamically
  function loadGoogleMaps(apiKey, cb) {
    if (window.__CarmaMapsLoaded) return cb();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=weekly&loading=async`;
    script.async = true; script.defer = true;
    script.onload = function () { window.__CarmaMapsLoaded = true; cb(); };
    script.onerror = function () {
      console.error('Failed to load Google Maps API');
      showMapsError('Failed to load Google Maps API. Check network, ad blockers, and API key.');
    };
    document.head.appendChild(script);
  }

  // Namespace
  window.CarmaMapsHelpers = {
    getBaguioBenguetBounds,
    showMapsError,
    showToast,
    ensureMapContainer,
    triggerResizeAndCenter,
    reverseGeocode,
    setMarkerPosition,
    loadGoogleMaps
  };
  // Back-compat: attach direct functions if code references them
  window.getBaguioBenguetBounds = window.getBaguioBenguetBounds || getBaguioBenguetBounds;
  window.showMapsError = window.showMapsError || showMapsError;
  window.showToast = window.showToast || showToast;
  window.ensureMapContainer = window.ensureMapContainer || ensureMapContainer;
  window.triggerResizeAndCenter = window.triggerResizeAndCenter || triggerResizeAndCenter;
  window.reverseGeocodeHelper = window.reverseGeocodeHelper || reverseGeocode;
  window.setMarkerPositionHelper = window.setMarkerPositionHelper || setMarkerPosition;
  window.loadGoogleMapsHelper = window.loadGoogleMapsHelper || loadGoogleMaps;
})();
