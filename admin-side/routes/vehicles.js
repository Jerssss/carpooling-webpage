const express = require("express");
const router = express.Router();
const { adminOnly } = require("../middlewares/auth");

// All vehicles (with optional filter)
router.get("/", adminOnly, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { filter } = req.query;
        let match = {};
        if (filter === "pending") match = { isVerified: false };
        else if (filter === "approved") match = { isVerified: true };

        const vehicles = await db.collection("vehicles").aggregate([
            { $match: match },
            { $lookup: { from: "users", localField: "ownerId", foreignField: "userID", as: "ownerInfo" } },
            { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } },
            { $sort: { _id: -1 } }
        ]).toArray();

        res.json(vehicles);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Single vehicle
router.get("/:id", adminOnly, async (req, res) => {
    const db = req.app.locals.db;
    const vehicle = await db.collection("vehicles").aggregate([
        { $match: { carId: req.params.id } },
        { $lookup: { from: "users", localField: "ownerId", foreignField: "userID", as: "ownerInfo" } },
        { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } }
    ]).toArray();

    if (!vehicle.length) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle[0]);
});

// Approve/reject vehicle
router.patch("/:id", adminOnly, async (req, res) => {
    const db = req.app.locals.db;
    const { isVerified } = req.body;
    const result = await db.collection("vehicles").updateOne(
        { carId: req.params.id },
        { $set: { isVerified, updatedAt: new Date() } }
    );
    if (!result.matchedCount) return res.status(404).json({ message: "Vehicle not found" });
    res.json({ message: `Vehicle ${isVerified ? "approved" : "rejected"}` });
});

module.exports = router;
