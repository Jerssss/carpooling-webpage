document.addEventListener("DOMContentLoaded", () => {
  console.log("register.js loaded");

  const form = document.querySelector(".registration-form");
  if (!form) return;

  // ==== FILE NAME PREVIEW =====
  const fileInputs = document.querySelectorAll(".file-upload-big input[type='file']");

  fileInputs.forEach(input => {
    input.addEventListener("change", () => {
      const file = input.files[0];
      const labelSpan = input.parentElement.querySelector(".file-label");

      if (file) {
        labelSpan.innerHTML = `<strong class="file-selected">${file.name}</strong>`;
      }
    });
  });

  // ===== FORM SUBMIT =====
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const formData = new FormData(form);
    const roleType = document.body.dataset.role;
    formData.append("roleType", roleType);

    try {
      const res = await fetch("register_user.php", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      alert(data.message);

      if (data.success) {
        let projectFolder = "/9467_it312-teamarc_midtermproject";
        window.location.href = `${projectFolder}/login.html`;
      }

    } catch (err) {
      alert("Registration failed.");
      console.error(err);
    }
  });
});
