document.addEventListener("DOMContentLoaded", () => {
    console.log("admin login.js loaded");
    const loginForm = document.getElementById("loginForm");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // prevent normal form submission

        const email = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const role = document.getElementById("role").value;

        if (role === "admin") {
            // Admin login using NodeJS backend + fetch
            try {
                console.log("Admin login via NodeJS fetch");
                const res = await fetch("http://localhost:4000/api/admin/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include", // include session cookies
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();
                console.log("Admin login response:", data);

                if (res.ok) {
                    // Redirect via full path relative to MAMP server root
                    window.location.href = "admin-side/admin-landing.html";
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error(err);
                alert("Server error. Try again later.");
            }
        } else if (role === "passenger") {
            console.log("Non-admin login via PHP");
            // Passenger login via PHP
            loginForm.action = "includes/login.php";
            loginForm.submit();
        } else if (role === "driver") {
            console.log("Non-admin login via PHP");
            // Driver login via PHP
            loginForm.action = "includes/login.php";
            loginForm.submit();
        }
    });
});
