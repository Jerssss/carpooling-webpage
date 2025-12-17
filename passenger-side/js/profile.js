// Editable fields based on users collection
const EDITABLE_FIELDS = ["name", "phoneNo", "occupation", "picture"];

document.addEventListener("DOMContentLoaded", () => {
  loadProfile();

  document.getElementById("editBtn").onclick = enableEdit;
  document.getElementById("profileForm").onsubmit = saveProfile;
});

function loadProfile() {
  fetch("includes/profile.php?action=get")
    .then(res => res.json())
    .then(user => {
      // Map MongoDB document to inputs
      Object.keys(user).forEach(key => {
        const input = document.getElementById(key);
        if (input) {
          input.value = Array.isArray(user[key])
            ? user[key].join(", ")
            : user[key];
        }
      });

      // Display-only header
      document.getElementById("displayName").textContent = user.name;
      document.getElementById("displayEmail").textContent = user.email;

      if (user.picture) {
        document.getElementById("profilePic").src = "../" + user.picture;
      }

      // Lock ALL inputs by default
      document.querySelectorAll("#profileForm input").forEach(i => i.disabled = true);
    });
}

function enableEdit() {
  // Enable ONLY allowed fields
  EDITABLE_FIELDS.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.disabled = false;
  });

  document.getElementById("saveBtn").hidden = false;
}

function saveProfile(e) {
  e.preventDefault();

  const payload = {};

  EDITABLE_FIELDS.forEach(id => {
    const input = document.getElementById(id);
    if (input) payload[id] = input.value;
  });

  fetch("includes/profile.php?action=update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(resp => {
    if (resp.success) {
      alert("Profile updated successfully");
      location.reload();
    }
  });
}
