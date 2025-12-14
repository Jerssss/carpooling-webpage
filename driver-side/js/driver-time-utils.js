// Time validation and constraints
// Provides CarmaTime namespace with reusable functions.
(function(){
  function getEarliestAllowedDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  function validateDeparture(val) {
    if (!val) return false;
    const selected = new Date(val);
    if (isNaN(selected.getTime())) return false;

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (selected < todayMidnight) return false; // past
    if (selected.getFullYear() === now.getFullYear() && selected.getMonth() === now.getMonth() && selected.getDate() === now.getDate()) return false; // current day not allowed

    if (selected.getDay() === 0) return false; // Sunday

    const earliest = getEarliestAllowedDate();
    const earliestMidnight = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate());
    const selectedMidnight = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
    if (selectedMidnight < earliestMidnight) return false;

    const min = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 7, 30, 0);
    const max = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 20, 0, 0);
    return selected >= min && selected <= max;
  }

  function setupTimePairConstraints(startSlotInput, endSlotInput) {
    if (!startSlotInput || !endSlotInput) return;

    const earliest = getEarliestAllowedDate();
    const yyyy = earliest.getFullYear();
    const mm = String(earliest.getMonth() + 1).padStart(2, '0');
    const dd = String(earliest.getDate()).padStart(2, '0');
    const minStr = `${yyyy}-${mm}-${dd}T07:30`;

    const maxDate = new Date(earliest); maxDate.setFullYear(maxDate.getFullYear() + 1);
    const maxY = maxDate.getFullYear(); const maxM = String(maxDate.getMonth() + 1).padStart(2, '0'); const maxD = String(maxDate.getDate()).padStart(2, '0');
    const maxStr = `${maxY}-${maxM}-${maxD}T20:00`;

    startSlotInput.min = minStr;
    startSlotInput.max = maxStr;

    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDay() === 0) {
      const info = document.createElement('div');
      info.className = 'time-info';
      info.textContent = 'Note: Tomorrow is Sunday. Earliest selectable day moved to next non-Sunday.';
      if (startSlotInput.parentElement) startSlotInput.parentElement.appendChild(info);
    }

    function lockEndToStartDate() {
      const sVal = startSlotInput.value;
      if (!sVal) return;
      const sDate = new Date(sVal);
      if (isNaN(sDate.getTime())) return;
      const y = sDate.getFullYear(); const m = String(sDate.getMonth() + 1).padStart(2, '0'); const d = String(sDate.getDate()).padStart(2, '0');
      const endMin = `${y}-${m}-${d}T07:40`;
      const endMax = `${y}-${m}-${d}T20:00`;
      endSlotInput.min = endMin;
      endSlotInput.max = endMax;
    }

    lockEndToStartDate();

    startSlotInput.addEventListener('change', function () {
      lockEndToStartDate();
      const sVal = startSlotInput.value;
      if (!validateDeparture(sVal)) {
        alert('Please select a valid first time slot: future non-Sunday between 7:30 AM and 8:00 PM.');
        startSlotInput.value = '';
        return;
      }
      const endVal = endSlotInput.value;
      if (endVal) {
        const s = new Date(sVal);
        const e2 = new Date(endVal);
        if (e2 <= s || (e2.getTime() - s.getTime()) < 10 * 60 * 1000) {
          alert('Second slot must be later and at least 10 minutes after the first.');
          endSlotInput.value = '';
        }
      }
    });

    endSlotInput.addEventListener('change', function () {
      const sVal = startSlotInput.value;
      const endVal = endSlotInput.value;
      if (!sVal || !endVal) return;
      const s = new Date(sVal);
      const e2 = new Date(endVal);
      if (e2 <= s || (e2.getTime() - s.getTime()) < 10 * 60 * 1000) {
        alert('Second slot must be later and at least 10 minutes after the first.');
        endSlotInput.value = '';
      }
    });
  }

  // Ensure second slot is on same day, later than first, and >= minGapMinutes
  function validateSecondSlot(startVal, endVal, minGapMinutes) {
    if (!startVal || !endVal) return false;
    const s = new Date(startVal);
    const e2 = new Date(endVal);
    if (isNaN(s.getTime()) || isNaN(e2.getTime())) return false;
    if (e2 <= s) return false;
    const diffMs = e2.getTime() - s.getTime();
    if (diffMs < (minGapMinutes || 10) * 60 * 1000) return false;
    // same day check
    return (
      e2.getFullYear() === s.getFullYear() &&
      e2.getMonth() === s.getMonth() &&
      e2.getDate() === s.getDate()
    );
  }

  // Build display string for two slots in local 12-hour format
  function buildDepartureDisplay(startVal, endVal) {
    const s = new Date(startVal);
    const e2 = new Date(endVal);
    const fmt = (d) => {
      const hh = d.getHours();
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ampm = hh >= 12 ? 'PM' : 'AM';
      const hour12 = ((hh + 11) % 12) + 1;
      return `${hour12}:${mm} ${ampm}`;
    };
    return `${fmt(s)} - ${fmt(e2)}`;
  }

  window.CarmaTime = {
    getEarliestAllowedDate,
    validateDeparture,
    setupTimePairConstraints,
    validateSecondSlot,
    buildDepartureDisplay
  };
})();
