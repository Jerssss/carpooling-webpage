<?php
// Set a cookie safely
function set_app_cookie($name, $value, $days = 7) {
    setcookie(
        $name,
        $value,
        time() + ($days * 86400),
        "/",            // available to whole site
        "",             // current domain
        false,          // HTTPS-only? set true if using HTTPS
        true            // HttpOnly (JS cannot access)
    );
}

// Delete a cookie
function delete_app_cookie($name) {
    setcookie($name, "", time() - 3600, "/");
}
