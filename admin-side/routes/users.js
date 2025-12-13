const express = require("express");
const router = express.Router();
const { adminOnly } = require("../middlewares/auth");

// Get all users
router.get("/", adminOnly, async (req, res) => {
    const db = req.app.locals.db;
    const users = await db.collection("users").find().toArray();
    res.json(users);
});

// Get user by ID
router.get("/:id", adminOnly, async (req, res) => {
    const db = req.app.locals.db;
    const user = await db.collection("users").findOne({ userID: req.params.id });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
});

// Verify/unverify user
router.patch("/:id/verify", adminOnly, async (req, res) => {
    const db = req.app.locals.db;
    const { isVerified } = req.body;
    await db.collection("users").updateOne({ userID: req.params.id }, { $set: { isVerified } });
    res.json({ message: "User updated" });
});

module.exports = router;
