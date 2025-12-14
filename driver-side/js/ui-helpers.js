// Shared UI helpers for toasts and lightweight diagnostics
// Provides a consistent toast API across modules.
(function(){
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

  window.CarmaUI = { showMapsError, showToast };
  // Back-compat globals if any code expects top-level
  window.showMapsError = window.showMapsError || showMapsError;
  window.showToast = window.showToast || showToast;
})();