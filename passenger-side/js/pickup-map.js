// pickup-map.js
// Adds Google Maps + Places Autocomplete for passenger pickup/meetup location

(function(){
  const API_KEY = 'ENV_API_KEY';
  const MAP_ID = window.GMAPS_MAP_ID || 'ENV_MAP_ID_KEY';
  if (!window.GMAPS_MAP_ID) window.GMAPS_MAP_ID = MAP_ID;

  const gcashInput = document.getElementById('pickupLocation');
  const cashInput = document.getElementById('cashPickupLocation');
  const openGcashBtn = document.getElementById('openGcashPickupMap');
  const openCashBtn = document.getElementById('openCashPickupMap');
  const modal = document.getElementById('pickupMapModal');
  const closeBtn = document.getElementById('closePickupMap');
  const useBtn = document.getElementById('usePickupLocation');
  const resetBtn = document.getElementById('resetPickupMarker');
  const gcashLatEl = document.getElementById('gcash-pickup-lat');
  const gcashLngEl = document.getElementById('gcash-pickup-lng');
  const cashLatEl = document.getElementById('cash-pickup-lat');
  const cashLngEl = document.getElementById('cash-pickup-lng');

  let mapsLoaded = false;
  let map = null;
  let marker = null;
  let geocoder = null;
  let autocompleteGcash = null;
  let autocompleteCash = null;
  let pickerContext = 'gcash'; // or 'cash'
  const initialCenter = { lat: 16.4023, lng: 120.5960 };

  function loadMaps(cb){
    if (mapsLoaded) return cb();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,marker&v=weekly&loading=async`;
    script.async = true; script.defer = true;
    script.onload = () => { mapsLoaded = true; cb(); };
    script.onerror = () => { showWarn('Failed to load Google Maps API'); };
    document.head.appendChild(script);
  }

  function initAutocomplete(){
    if (!window.google || !google.maps || !google.maps.places) return;
    if (gcashInput && !autocompleteGcash) {
      autocompleteGcash = new google.maps.places.Autocomplete(gcashInput, {
        fields: ['place_id','geometry','name','formatted_address'],
        types: ['geocode']
      });
    }
    if (cashInput && !autocompleteCash) {
      autocompleteCash = new google.maps.places.Autocomplete(cashInput, {
        fields: ['place_id','geometry','name','formatted_address'],
        types: ['geocode']
      });
    }
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(16.2000, 120.5000),
      new google.maps.LatLng(16.6000, 121.0000)
    );
    if (autocompleteGcash) {
      autocompleteGcash.setBounds(bounds); autocompleteGcash.setOptions({ strictBounds: false });
      autocompleteGcash.addListener('place_changed', () => handlePlace(autocompleteGcash, gcashLatEl, gcashLngEl, gcashInput));
    }
    if (autocompleteCash) {
      autocompleteCash.setBounds(bounds); autocompleteCash.setOptions({ strictBounds: false });
      autocompleteCash.addListener('place_changed', () => handlePlace(autocompleteCash, cashLatEl, cashLngEl, cashInput));
    }
  }

  function handlePlace(ac, latEl, lngEl, input){
    const place = ac.getPlace();
    if (!place || !place.geometry || !place.geometry.location) return;
    const loc = place.geometry.location;
    const lat = loc.lat();
    const lng = loc.lng();
    latEl.value = lat; lngEl.value = lng;
    // Basic bounds check
    const within = (lat >= 16.2000 && lat <= 16.6000 && lng >= 120.5000 && lng <= 121.0000);
    if (!within) {
      alert('Select a location within Baguio/Benguet.');
      input.value = ''; latEl.value=''; lngEl.value='';
    }
  }

  function openModal(){
    loadMaps(() => {
      setupMap();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden','false');
      (useBtn && useBtn.focus && useBtn.focus());
    });
  }
  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    const returnTarget = pickerContext === 'gcash' ? openGcashBtn : openCashBtn;
    returnTarget && returnTarget.focus && returnTarget.focus();
  }

  function setupMap(){
    if (!window.google || !google.maps) return;
    geocoder = geocoder || new google.maps.Geocoder();
    const mapEl = document.getElementById('pickupMap');
    if (mapEl) mapEl.innerHTML='';
    const existingLat = pickerContext === 'gcash' ? parseFloat(gcashLatEl.value) : parseFloat(cashLatEl.value);
    const existingLng = pickerContext === 'gcash' ? parseFloat(gcashLngEl.value) : parseFloat(cashLngEl.value);
    const center = (!isNaN(existingLat) && !isNaN(existingLng)) ? { lat: existingLat, lng: existingLng } : initialCenter;
    const opts = { center, zoom: 14, streetViewControl: false, mapTypeControl: false };
    if (MAP_ID) opts.mapId = MAP_ID;
    map = new google.maps.Map(mapEl, opts);
    if (!(google.maps.marker && google.maps.marker.AdvancedMarkerElement)) { showWarn('Advanced Markers unavailable.'); return; }
    marker = new google.maps.marker.AdvancedMarkerElement({ position: center, map, gmpDraggable: true });
    marker.addListener('dragend', () => {
      const p = getMarkerLatLng();
      if (!p) return;
      if (pickerContext === 'gcash') { gcashLatEl.value = p.lat; gcashLngEl.value = p.lng; reverseGeocode(p.lat, p.lng, gcashInput); }
      else { cashLatEl.value = p.lat; cashLngEl.value = p.lng; reverseGeocode(p.lat, p.lng, cashInput); }
    });
    // Geocode typed value if no coords yet
    const typedValue = pickerContext === 'gcash' ? (gcashInput && gcashInput.value) : (cashInput && cashInput.value);
    const hasCoords = !isNaN(existingLat) && !isNaN(existingLng);
    if (!hasCoords && typedValue && typedValue.trim().length){
      geocoder.geocode({ address: typedValue, region: 'PH' }, (results, status) => {
        if (status === 'OK' && results && results.length){
          const loc = results[0].geometry.location;
          setMarkerPosition(loc.lat(), loc.lng());
          if (pickerContext === 'gcash') { gcashLatEl.value = loc.lat(); gcashLngEl.value = loc.lng(); gcashInput.value = results[0].formatted_address || gcashInput.value; }
          else { cashLatEl.value = loc.lat(); cashLngEl.value = loc.lng(); cashInput.value = results[0].formatted_address || cashInput.value; }
        }
      });
    }
  }

  function reverseGeocode(lat,lng,targetInput){
    if (!geocoder) return;
    geocoder.geocode({ location: { lat,lng } }, (results,status) => {
      if (status==='OK' && results && results.length){
        targetInput.value = results[0].formatted_address || targetInput.value;
      }
    });
  }

  function getMarkerLatLng(){
    if (!marker || !marker.position) return null;
    const pos = marker.position; const lat = typeof pos.lat==='function'?pos.lat():pos.lat; const lng = typeof pos.lng==='function'?pos.lng():pos.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null; return { lat,lng };
  }
  function setMarkerPosition(lat,lng){ if (!marker || !map) return; marker.position = { lat,lng }; map.setCenter({ lat,lng }); }
  function resetMarker(){ if (!marker || !map) return; marker.position = initialCenter; map.setCenter(initialCenter); if (pickerContext==='gcash'){ gcashLatEl.value=initialCenter.lat; gcashLngEl.value=initialCenter.lng; reverseGeocode(initialCenter.lat,initialCenter.lng,gcashInput); } else { cashLatEl.value=initialCenter.lat; cashLngEl.value=initialCenter.lng; reverseGeocode(initialCenter.lat,initialCenter.lng,cashInput); } }

  function showWarn(msg){ try { const d=document.createElement('div'); d.className='toast-warning'; d.textContent=msg; document.body.appendChild(d); setTimeout(()=>d.remove(),5000); } catch(e){ console.warn(msg); } }
  function showToast(msg){ try { const d=document.createElement('div'); d.className='toast'; d.textContent=msg; document.body.appendChild(d); setTimeout(()=>d.remove(),2500); } catch(e){} }

  // Events
  if (openGcashBtn) openGcashBtn.addEventListener('click', () => { pickerContext='gcash'; openModal(); });
  if (openCashBtn) openCashBtn.addEventListener('click', () => { pickerContext='cash'; openModal(); });
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (resetBtn) resetBtn.addEventListener('click', resetMarker);
  if (useBtn) useBtn.addEventListener('click', () => {
    const p = getMarkerLatLng();
    if (!p){ showWarn('Move the pin to choose a location.'); return; }
    if (pickerContext==='gcash'){ gcashLatEl.value=p.lat; gcashLngEl.value=p.lng; reverseGeocode(p.lat,p.lng,gcashInput); }
    else { cashLatEl.value=p.lat; cashLngEl.value=p.lng; reverseGeocode(p.lat,p.lng,cashInput); }
    showToast('Pickup location selected');
    closeModal();
  });

  // Lazy load maps on first focus
  gcashInput && gcashInput.addEventListener('focus', () => loadMaps(initAutocomplete));
  cashInput && cashInput.addEventListener('focus', () => loadMaps(initAutocomplete));

  document.addEventListener('DOMContentLoaded', () => {
    // Optional early load if either field present
    if (gcashInput || cashInput){ loadMaps(initAutocomplete); }
  });
})();
