const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const { adminOnly } = require("../middlewares/auth");

// Admin login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = req.app.locals.db;
        const users = db.collection("users");

        const user = await users.findOne({ email: email, role: "admin" });
        if (!user) return res.status(401).json({ message: "Admin not found" });

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ message: "Invalid password" });

        req.session.admin = {
            userID: user.userID,
            name: user.name,
            email: user.email,
            role: user.role
        };
        res.json({ message: "Login successful", admin: req.session.admin });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Admin logout
router.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: "Logout failed" });
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
    });
});

// Dashboard
router.get("/dashboard", adminOnly, (req, res) => {
    res.json({ message: "Welcome, " + req.session.admin.name });
});

// Session check for debugging
router.get("/check", (req, res) => {
    res.json({ session: req.session });
});

module.exports = router;
