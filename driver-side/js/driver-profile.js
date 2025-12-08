document.addEventListener('DOMContentLoaded', () => {
  loadDriverProfile();
  setupEditSave();
});

function resolvePath(path) {
  if (!path) return '../images/speed.jpg';
  // If already absolute or starts with '../', return as is
  if (/^https?:\/\//.test(path) || path.startsWith('../')) return path;
  // Paths from DB like 'images/...'
  if (path.startsWith('images/')) return '../' + path;
  return path;
}

async function loadDriverProfile() {
  try {
    const res = await fetch('../includes/get_driver_profile.php', { credentials: 'include' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to load profile');

    const p = data.profile || {};
    // Navbar name + picture
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = p.name || 'Driver';
    const userPicEls = document.querySelectorAll('.user-pic');
    userPicEls.forEach(img => { img.src = resolvePath(p.picture) || '../images/speed.jpg'; });

    // Header
    const headerName = document.querySelector('.profile-header .user-basic h2');
    const headerEmail = document.querySelector('.profile-header .user-basic p');
    const headerPhoto = document.querySelector('.profile-header .profile-photo');
    if (headerName) headerName.textContent = p.name || '';
    if (headerEmail) headerEmail.textContent = p.email || '';
    if (headerPhoto) headerPhoto.src = resolvePath(p.picture) || '../images/speed.jpg';

    // Form fields
    setValue('fullName', p.name);
    setValue('contactNumber', p.phoneNo);
    setValue('gender', p.gender);
    setValue('licenseNumber', p.licenseNumber);
    const v = p.vehicle || {};
    setValue('carMake', v.carMake);
    setValue('carModel', v.carModel);
    setValue('yearModel', v.year);
    setValue('plateNumber', v.plateNo);
    setValue('capacity', v.cap);
    const carPhotoEl = document.getElementById('carPhoto');
    if (carPhotoEl) carPhotoEl.src = resolvePath(v.carPhoto || 'images/car_pics/default_car.png');
    setValue('vehicleVerified', v.isVerified ? 'Yes' : 'No');

    // Set inputs to readonly initially
    setReadOnly(true);
  } catch (e) {
    console.error(e);
  }
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function setReadOnly(readonly) {
  const ids = ['fullName','contactNumber','gender','licenseNumber','carMake','carModel','yearModel','plateNumber','capacity'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.readOnly = readonly;
  });
}

function setupEditSave() {
  const editBtn = document.querySelector('.edit-btn');
  if (!editBtn) return;
  let editing = false;
  editBtn.addEventListener('click', async () => {
    if (!editing) {
      editing = true;
      editBtn.textContent = 'Save';
      setReadOnly(false);
    } else {
      // Save
      const payload = {
        name: getVal('fullName'),
        phoneNo: getVal('contactNumber'),
        gender: getVal('gender'),
        licenseNumber: getVal('licenseNumber'),
        vehicle: {
          carMake: getVal('carMake'),
          carModel: getVal('carModel'),
          year: Number(getVal('yearModel')) || null,
          plateNo: getVal('plateNumber'),
          cap: Number(getVal('capacity')) || null,
          // carPhoto not edited here; separate upload or input would be needed
        }
      };
      try {
        const res = await fetch('../includes/update_driver_profile.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Update failed');
        editing = false;
        editBtn.textContent = 'Edit';
        setReadOnly(true);
        // Refresh header name/email
        await loadDriverProfile();
      } catch (e) {
        console.error(e);
        alert('Failed to save changes.');
      }
    }
  });
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
