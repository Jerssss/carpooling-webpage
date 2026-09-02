// location-map.js
// Purpose: Show a simple, reusable map modal with a single pin.
// Called via window.showLocationOnMap(address, label) by other scripts.
(function () {
    // Modal DOM references
    // Support both passenger-side and driver-side modal IDs
    const modal = document.getElementById('locationMapModal') || document.getElementById('locMapModal');
    const closeBtn = document.getElementById('closeLocationMap') || document.getElementById('closeLocMap');
    const mapTitle = document.getElementById('locationMapTitle') || document.getElementById('locMapTitle');
    const mapEl = document.getElementById('locationMap') || document.getElementById('locMap');
    const backdropEl = document.querySelector('#locationMapModal .map-backdrop') || document.querySelector('#locMapModal .map-backdrop');

    // Runtime map state
    let loaded = false;
    let map = null;
    let marker = null;
    let geocoder = null;

    // Ensure addresses are geocodable by appending local context and normalizing known aliases
    function normalizeAddress(address) {
        if (!address) return '';
        const raw = String(address).trim();
        if (!raw || raw.toUpperCase() === 'N/A') return '';
        // Normalize campus short form
        const campusShort = /slu\s*maryheights\s*campus/i;
        const campusFull = 'SLU Maryheights Campus, Baguio, Benguet, Philippines';
        if (campusShort.test(raw)) return campusFull;
        // Append locality if missing to improve geocode hit rate
        const hasLocality = /(baguio|benguet|philippines)/i.test(raw);
        return hasLocality ? raw : `${raw}, Baguio, Benguet, Philippines`;
    }

    // Lazy-load the Google Maps script (Marker library only; no Places needed here)
    function loadMaps(cb) {
        if (loaded) return cb();
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=marker&v=weekly&loading=async`;
        script.async = true; script.defer = true;
        script.onload = () => { loaded = true; cb(); };
        script.onerror = () => console.warn('Failed to load Google Maps API');
        document.head.appendChild(script);
    }

    // Open the modal and move focus to the close button for accessibility
    function openModal() {
        if (!modal) return;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        closeBtn && closeBtn.focus && closeBtn.focus();
    }

    // Close the modal and mark it as hidden
    function closeModal() {
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    // Create the map instance and drop a single marker at the given center
    function initMap(center) {
        if (!mapEl) return;
        mapEl.innerHTML = '';
        const opts = { center, zoom: 16, streetViewControl: false, mapTypeControl: false };
        if (MAP_ID) opts.mapId = MAP_ID;
        map = new google.maps.Map(mapEl, opts);

        // Require AdvancedMarkerElement
        if (!(google.maps.marker && google.maps.marker.AdvancedMarkerElement)) {
            console.warn('AdvancedMarkerElement unavailable; map shown without pin.');
            return;
        }
        marker = new google.maps.marker.AdvancedMarkerElement({ position: center, map });
    }

    // Geocode a human-readable address to lat/lng (PH region bias)
    async function geocodeAddress(address) {
        if (!geocoder) geocoder = new google.maps.Geocoder();
        return new Promise((resolve, reject) => {
            geocoder.geocode({ address, region: 'PH' }, (results, status) => {
                if (status === 'OK' && results && results.length) {
                    const loc = results[0].geometry.location;
                    resolve({ lat: loc.lat(), lng: loc.lng(), formatted: results[0].formatted_address });
                } else {
                    reject(status || 'GEOCODE_FAILED');
                }
            });
        });
    }

    // Retry wrapper: handle occasional first-call flakiness after script load
    async function geocodeWithRetry(address, attempts = 2) {
        let lastErr = null;
        for (let i = 0; i < Math.max(1, attempts); i++) {
            try {
                return await geocodeAddress(address);
            } catch (err) {
                lastErr = err;
                // small backoff before retrying
                await new Promise(r => setTimeout(r, i === 0 ? 250 : 600));
            }
        }
        throw lastErr || 'GEOCODE_FAILED';
    }

    // Public API: load Maps if needed, geocode, initialize map, and show the modal
    async function showLocationOnMap(address, label) {
        const prepared = normalizeAddress(address);
        if (!prepared) {
            alert('No valid address available to locate.');
            return;
        }
        mapTitle && (mapTitle.textContent = label || 'Location');
        loadMaps(async () => {
            try {
                // Geocode with normalized address only (no broader fallback)
                const pos = await geocodeWithRetry(prepared, 2);
                initMap({ lat: pos.lat, lng: pos.lng });
                openModal();
            } catch (err) {
                alert('Could not locate the address on the map.');
            }
        });
    }

    // Expose for other scripts (used by search_filter.js card icon buttons)
    window.showLocationOnMap = showLocationOnMap;

    // Close interactions: close button, backdrop click, and Escape key
    closeBtn && closeBtn.addEventListener('click', closeModal);
    modal && modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    backdropEl && backdropEl.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // Preload Maps on DOM ready to avoid first-click latency/flakiness
    document.addEventListener('DOMContentLoaded', () => {
        loadMaps(() => { });
    });
})();
