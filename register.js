document.addEventListener("DOMContentLoaded", () => {
  console.log("register.js loaded");

  const form = document.querySelector(".registration-form");
  if (!form) return;

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
        // Assuming login.html is in the root of your project folder
        let projectFolder = "/9467_it312-teamarc_midtermproject"; // <-- your project folder in htdocs
        window.location.href = `${projectFolder}/login.html`;
      }

    } catch (err) {
      alert("Registration failed.");
      console.error(err);
    }
  });
});
