function showFeedback(message, type = "error") {
    const feedback = document.getElementById("login-feedback");
    feedback.textContent = message;
    feedback.className = `form-feedback ${type}`;
    feedback.classList.remove("hidden");
}

function clearFeedback() {
    const feedback = document.getElementById("login-feedback");
    feedback.classList.add("hidden");
    feedback.textContent = "";
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("admin login.js loaded");

    // HANDLE PHP REDIRECT ERRORS
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");

    if (error) {
        if (error === "user_not_found") {
            showFeedback("No account found with that email.");
        } else if (error === "incorrect_password") {
            showFeedback("Incorrect password.");
        } else if (error === "server_error") {
            showFeedback("Server error. Please try again later.");
        } else {
            showFeedback("Login failed. Please try again.");
        }
    }

    const loginForm = document.getElementById("loginForm");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFeedback();

        const email = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const role = document.getElementById("role").value;

        if (!role) {
            showFeedback("Please select a role.");
            return;
        }

        if (role === "admin") {
            try {
                const res = await fetch("http://localhost:4000/api/admin/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    showFeedback(data.message || "Admin login failed.");
                    return;
                }

                window.location.href = "admin-side/admin-landing.html";

            } catch (err) {
                showFeedback("Server error. Please try again later.");
            }

        } else {
            // PHP login → normal submit
            loginForm.action = "includes/login.php";
            loginForm.submit();
        }
    });
});
