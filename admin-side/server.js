const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { MongoClient } = require("mongodb");
require("dotenv").config({ path: ".env" });
console.log("MONGO_URI =", process.env.MONGO_URI);

const app = express();
app.use(express.json());
app.use(cors({
    origin: "http://localhost", // Note: Remove 8888 if you're not on MAC
    credentials: true
}));

// Test route
app.get("/api/test", (req, res) => {
    res.json({ message: "Server working" });
});


// Session setup
app.use(session({
    secret: "supersecretadminkey",
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 30 * 60 * 1000,
        sameSite: "lax", // for cross-origin
        secure: false // true if using https
    }
}));

const client = new MongoClient(process.env.MONGO_URI);
const dbName = "carpooling_data";

async function connectDB() {
    try {
        await client.connect();
        console.log("NodeJS connected to MongoDB");
    } catch (err) {
        console.error("MongoDB error:", err);
    }
}
connectDB();

// Protect all admin routes
function adminOnly(req, res, next) {
    console.log("adminOnly session:", req.session.admin);
    if (!req.session.admin) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
}


// Admin login route
app.post("/api/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = client.db(dbName);
        const users = db.collection("users");

        const user = await users.findOne({ email: email, role: "admin" });

        if (!user) {
            return res.status(401).json({ message: "Admin not found" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // Set session
        req.session.admin = {
            userID: user.userID,
            name: user.name,
            email: user.email,
            role: user.role
        };

        return res.json({ message: "Login successful", admin: req.session.admin });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});

// test route
app.get("/api/admin/test-users", async (req, res) => {
    const db = client.db(dbName);
    const users = await db.collection("users").find().toArray();
    res.json(users);
});

// Example: check session
app.get("/api/admin/dashboard", (req, res) => {
    if (!req.session.admin) {
        return res.status(401).json({ message: "Not logged in" });
    }
    res.json({ message: "Welcome, " + req.session.admin.name });
});

// ====================================
// USER MANAGEMENT ROUTES AND ENDPOINTS
// ====================================
// Fetch all users
app.get("/api/admin/users", adminOnly, async (req, res) => {
    console.log("GET /api/admin/users hit");
    const db = client.db(dbName);
    const users = await db.collection("users").find().toArray();
    res.json(users);
});

// Fetch single user details
app.get("/api/admin/users/:id", adminOnly, async (req, res) => {
    console.log("GET user by ID hit:", req.params.id);
    try {
        const db = client.db(dbName);
        const user = await db.collection("users").findOne({ userID: req.params.id });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


// Verify or Unverify a user
app.patch("/api/admin/users/:id/verify", adminOnly, async (req, res) => {
    const db = client.db(dbName);
    const { isVerified } = req.body;

    await db.collection("users").updateOne(
        { userID: req.params.id },
        { $set: { isVerified } }
    );

    res.json({ message: "User updated" });
});

// ========================================================
// MANAGING VEHICLES AND REGISTRATION ROUTES AND  ENDPOINTS
// ========================================================
// Get all vehicles with owner information (with optional filter)
app.get("/api/admin/vehicles", adminOnly, async (req, res) => {
    try {
        const db = client.db(dbName);
        const { filter } = req.query; // 'all', 'pending', 'approved'

        let matchCondition = {};
        
        if (filter === 'pending') {
            matchCondition = { isVerified: false };
        } else if (filter === 'approved') {
            matchCondition = { isVerified: true };
        }
        // If filter is 'all' or undefined, matchCondition stays empty (matches all)

        const vehicles = await db.collection("vehicles").aggregate([
            {
                $match: matchCondition
            },
            {
                $lookup: {
                    from: "users",
                    localField: "ownerId",
                    foreignField: "userID",
                    as: "ownerInfo"
                }
            },
            {
                $unwind: {
                    path: "$ownerInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: { _id: -1 } // Most recent first
            }
        ]).toArray();

        res.json(vehicles);
    } catch (err) {
        console.error("Error fetching vehicles:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get pending vehicles with owner information
app.get("/api/admin/vehicles/pending", adminOnly, async (req, res) => {
    try {
        const db = client.db(dbName);

        const vehicles = await db.collection("vehicles").aggregate([
            {
                $match: { isVerified: false }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "ownerId",
                    foreignField: "userID",
                    as: "ownerInfo"
                }
            },
            {
                $unwind: {
                    path: "$ownerInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: { _id: -1 } // Most recent first
            }
        ]).toArray();

        res.json(vehicles);
    } catch (err) {
        console.error("Error fetching pending vehicles:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get single vehicle with full details
app.get("/api/admin/vehicles/:id", adminOnly, async (req, res) => {
    try {
        const db = client.db(dbName);
        
        const vehicle = await db.collection("vehicles").aggregate([
            {
                $match: { carId: req.params.id }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "ownerId",
                    foreignField: "userID",
                    as: "ownerInfo"
                }
            },
            {
                $unwind: {
                    path: "$ownerInfo",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]).toArray();

        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        res.json(vehicle[0]);
    } catch (err) {
        console.error("Error fetching vehicle:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Update vehicle verification status (approve/reject)
app.patch("/api/admin/vehicles/:id", adminOnly, async (req, res) => {
    const db = client.db(dbName);
    const { isVerified } = req.body; // true for approve, false for reject

    try {
        const result = await db.collection("vehicles").updateOne(
            { carId: req.params.id },
            { 
                $set: { 
                    isVerified,
                    updatedAt: new Date()
                } 
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        res.json({ message: `Vehicle ${isVerified ? "approved" : "rejected"}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ============================================
// MONITORING ACTIVE RIDES ROUTES AND  ENDPOINTS
// ============================================
// Monitor active rides
app.get("/api/admin/rides/active", adminOnly, async (req, res) => {
    try {
        const db = client.db(dbName);
        const rides = await db.collection("rides")
            .find({ status: "available" })
            .toArray();
        res.json(rides);
    } catch (err) {
        console.error("Error fetching active rides:", err);
        res.status(500).json({ message: "Failed to fetch active rides" });
    }
});

// Get all vehicles (for matching carId with vehicle details)
app.get("/api/admin/vehicles", adminOnly, async (req, res) => {
    try {
        const db = client.db(dbName);
        const vehicles = await db.collection("vehicles").find().toArray();
        res.json(vehicles);
    } catch (err) {
        console.error("Error fetching vehicles:", err);
        res.status(500).json({ message: "Failed to fetch vehicles" });
    }
});

// Get bookings per ride
app.get("/api/admin/bookings/:rideId", adminOnly, async (req, res) => {
    try{
        const db = client.db(dbName);
        const bookings = await db.collection("bookings")
            .find({ rideId: req.params.rideId })
            .toArray();
        res.json(bookings);
    } catch(err){
        console.error("Error fetching bookings:", err);
        res.status(500).json({ message: "Failed to fetch bookings" });
    }
});

// Monitor Transactions or Payments
app.get("/api/admin/payments", adminOnly, async (req, res) => {
    try {
        const db = client.db(dbName);
        const payments = await db.collection("payments").find().toArray();
        res.json(payments);
    } catch (err) {
        console.error("Error fetching payments:", err);
        res.status(500).json({ message: "Failed to fetch payments" });
    }
});

// ====================================================
// MANAGING COMPLAINTS AND REPORTS ROUTES AND  ENDPOINTS
// =====================================================
// Manage Reports and Complaints. Note to self: be careful with aggregations and pipelines cuz they're case sensitive
app.get("/api/admin/reports", adminOnly, async (req, res) => {
    try {
        const db = client.db(dbName);

        const reports = await db.collection("complaints").aggregate([
            // JOIN passenger user info
            {
                $lookup: {
                    from: "users",
                    localField: "passengerId",
                    foreignField: "userID",
                    as: "passenger"
                }
            },
            { $unwind: "$passenger" },

            // JOIN driver user info
            {
                $lookup: {
                    from: "users",
                    localField: "driverId",
                    foreignField: "userID",
                    as: "driver"
                }
            },
            { $unwind: "$driver" },

            // JOIN ride info
            {
                $lookup: {
                    from: "rides",
                    localField: "rideId",
                    foreignField: "rideId",
                    as: "ride"
                }
            },
            { $unwind: "$ride" },

            // Final output format
            {
                $project: {
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
                }
            }
        ]).toArray();

        res.json(reports);
    } catch (error) {
        console.error("Error fetching reports:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get single report details based on the complaint ID
app.get("/api/admin/reports/:id", adminOnly, async (req, res) => {
    try {
        const complaintId = req.params.id;
        const db = client.db(dbName);

        const report = await db.collection("complaints").aggregate([
            // Match complaint by complaintId
            { $match: { complaintId: complaintId } },

            // JOIN passenger user info
            {
                $lookup: {
                    from: "users",
                    localField: "passengerId",
                    foreignField: "userID",
                    as: "passenger"
                }
            },
            { $unwind: { path: "$passenger", preserveNullAndEmptyArrays: true } },

            // JOIN driver user info
            {
                $lookup: {
                    from: "users",
                    localField: "driverId",
                    foreignField: "userID",
                    as: "driver"
                }
            },
            { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },

            // JOIN ride info
            {
                $lookup: {
                    from: "rides",
                    localField: "rideId",
                    foreignField: "rideId",
                    as: "ride"
                }
            },
            { $unwind: { path: "$ride", preserveNullAndEmptyArrays: true } },

            // JOIN vehicle info (driver's vehicle)
            {
                $lookup: {
                    from: "vehicles",
                    localField: "driverId",
                    foreignField: "ownerId",
                    as: "vehicle"
                }
            },
            { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },

            // Project all necessary fields
            {
                $project: {
                    _id: 0,
                    complaintId: 1,
                    rideId: 1,
                    driverId: 1,
                    passengerId: 1,
                    complaintMessage: 1,
                    status: 1,
                    createdAt: 1,

                    // Passenger details
                    passengerName: "$passenger.name",
                    passengerEmail: "$passenger.email",
                    passengerOccupation: "$passenger.occupation",
                    passengerPhone: "$passenger.phoneNo",

                    // Driver details
                    driverName: "$driver.name",
                    driverEmail: "$driver.email",
                    driverOccupation: "$driver.occupation",
                    driverPhone: "$driver.phoneNo",
                    driverIDNumber: "$driver.userID",

                    // Ride details
                    rideDate: "$ride.date",
                    rideOrigin: "$ride.pickupLocation",
                    rideDestination: "$ride.dropoffLocation",

                    // Vehicle details
                    carId: "$vehicle.carId",
                    carMake: "$vehicle.carMake",
                    carModel: "$vehicle.carModel",
                    plateNo: "$vehicle.plateNo",
                    color: "$vehicle.color",
                    seats: "$vehicle.seats"
                }
            }
        ]).toArray();

        if (!report || report.length === 0) {
            return res.status(404).json({ message: "Report not found" });
        }

        res.json(report[0]); // return single report object
    } catch (err) {
        console.error("Error fetching report details:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Mark a report as resolved
app.patch("/api/admin/reports/:id/status", adminOnly, async (req, res) => {
    try {
        const complaintId = req.params.id;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: "Status is required" });
        }

        const db = client.db(dbName);

        const result = await db.collection("complaints").updateOne(
            { complaintId: complaintId }, // Match by complaint ID
            { $set: { status: status } } // Update the status
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Complaint not found" });
        }

        res.json({ message: "Complaint status updated successfully" });

    } catch (error) {
        console.error("Error updating complaint:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(4000, () => {
    console.log("Admin NodeJS backend running at port 4000");
});

// Debug 
app.get("/api/admin/check", (req, res) => {
    res.json({ session: req.session });
});

