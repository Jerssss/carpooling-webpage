const express = require("express");
const router = express.Router();
const { adminOnly } = require("../middlewares/auth");

// All reports
router.get("/", adminOnly, async (req, res) => {
    const db = req.app.locals.db;
    const reports = await db.collection("complaints").aggregate([
        { $lookup: { from: "users", localField: "passengerId", foreignField: "userID", as: "passenger" } },
        { $unwind: "$passenger" },
        { $lookup: { from: "users", localField: "driverId", foreignField: "userID", as: "driver" } },
        { $unwind: "$driver" },
        { $lookup: { from: "rides", localField: "rideId", foreignField: "rideId", as: "ride" } },
        { $unwind: "$ride" },
        { $project: {
            _id: 0,
            complaintId: 1,
            rideId: 1,
            driverId: 1,
            passengerId: 1,
            complaintMessage: 1,
            status: 1,
            createdAt: 1,
            passengerName: "$passenger.name",
            passengerEmail: "$passenger.email",
            driverName: "$driver.name",
            driverEmail: "$driver.email",
            rideDate: "$ride.date",
            rideOrigin: "$ride.pickupLocation",
            rideDestination: "$ride.dropoffLocation"
        }}
    ]).toArray();
    res.json(reports);
});

// Single report
router.get("/:id", adminOnly, async (req, res) => {
    const db = req.app.locals.db;
    const complaintId = req.params.id;
    const report = await db.collection("complaints").aggregate([
        { $match: { complaintId } },
        { $lookup: { from: "users", localField: "passengerId", foreignField: "userID", as: "passenger" } },
        { $unwind: { path: "$passenger", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "users", localField: "driverId", foreignField: "userID", as: "driver" } },
        { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "rides", localField: "rideId", foreignField: "rideId", as: "ride" } },
        { $unwind: { path: "$ride", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "vehicles", localField: "driverId", foreignField: "ownerId", as: "vehicle" } },
        { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
        { $project: {
            _id: 0,
            complaintId: 1,
            rideId: 1,
            driverId: 1,
            passengerId: 1,
            complaintMessage: 1,
            status: 1,
            createdAt: 1,
            passengerName: "$passenger.name",
            passengerEmail: "$passenger.email",
            passengerOccupation: "$passenger.occupation",
            passengerPhone: "$passenger.phoneNo",
            driverName: "$driver.name",
            driverEmail: "$driver.email",
            driverOccupation: "$driver.occupation",
            driverPhone: "$driver.phoneNo",
            driverIDNumber: "$driver.userID",
            rideDate: "$ride.date",
            rideOrigin: "$ride.pickupLocation",
            rideDestination: "$ride.dropoffLocation",
            carId: "$vehicle.carId",
            carMake: "$vehicle.carMake",
            carModel: "$vehicle.carModel",
            plateNo: "$vehicle.plateNo",
            color: "$vehicle.color",
            seats: "$vehicle.seats"
        }}
    ]).toArray();

    if (!report.length) return res.status(404).json({ message: "Report not found" });
    res.json(report[0]);
});

// Update report status
router.patch("/:id/status", adminOnly, async (req, res) => {
    const db = req.app.locals.db;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required" });

    const result = await db.collection("complaints").updateOne(
        { complaintId: req.params.id },
        { $set: { status } }
    );
    if (!result.matchedCount) return res.status(404).json({ error: "Complaint not found" });

    res.json({ message: "Complaint status updated successfully" });
});

module.exports = router;
