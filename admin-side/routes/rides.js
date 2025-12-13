const express = require("express");
const router = express.Router();
const { adminOnly } = require("../middlewares/auth");

// Active rides
router.get("/active", adminOnly, async (req, res) => {
    const db = req.app.locals.db;
    const rides = await db.collection("rides").find({ status: "available" }).toArray();
    res.json(rides);
});

// Bookings for a ride
router.get("/bookings/:rideId", adminOnly, async (req, res) => {
    const db = req.app.locals.db;
    const bookings = await db.collection("bookings").find({ rideId: req.params.rideId }).toArray();
    res.json(bookings);
});

module.exports = router;
