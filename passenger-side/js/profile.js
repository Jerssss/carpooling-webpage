// Editable fields based on users collection
const EDITABLE_FIELDS = ["name", "phoneNo", "occupation", "picture"];

let isEditing = false;

document.addEventListener("DOMContentLoaded", () => {
  loadProfile();

  document.getElementById("editBtn").addEventListener("click", toggleEditSave);
  document.getElementById("profileForm").addEventListener("submit", saveProfile);
});

function loadProfile() {
  fetch("includes/profile.php?action=get")
    .then(res => res.json())
    .then(user => {
      Object.keys(user).forEach(key => {
        const input = document.getElementById(key);
        if (input) {
          input.value = Array.isArray(user[key])
            ? user[key].join(", ")
            : user[key];
        }
      });

      document.getElementById("displayName").textContent = user.name;
      document.getElementById("displayEmail").textContent = user.email;

      if (user.picture) {
        document.getElementById("profilePic").src = "../" + user.picture;
      }

      document.querySelectorAll("#profileForm input")
        .forEach(i => i.disabled = true);
    });
}

function toggleEditSave() {
  const btn = document.getElementById("editBtn");

  if (!isEditing) {
    // Enable edit mode
    EDITABLE_FIELDS.forEach(id => {
      const input = document.getElementById(id);
      if (input) input.disabled = false;
    });

    btn.textContent = "Save";
    isEditing = true;
  } else {
    // Submit form when saving
    document.getElementById("profileForm").requestSubmit();
  }
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
