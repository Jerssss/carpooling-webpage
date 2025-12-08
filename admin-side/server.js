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
    origin: "http://localhost:8888", // your frontend origin
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


// Verify or Unveryfy a user
app.patch("/api/admin/users/:id/verify", adminOnly, async (req, res) => {
    const db = client.db(dbName);
    const { isVerified } = req.body;

    await db.collection("users").updateOne(
        { userID: req.params.id },
        { $set: { isVerified } }
    );

    res.json({ message: "User updated" });
});

// Get pending vehicles
app.get("/api/admin/vehicles/pending", adminOnly, async (req, res) => {
    const db = client.db(dbName);

    const vehicles = await db.collection("vehicles")
        .find({ isVerified: false })
        .toArray();

    res.json(vehicles);
});

// Update vehicle verification status (approve/reject)
app.patch("/api/admin/vehicles/:id", adminOnly, async (req, res) => {
    const db = client.db(dbName);
    const { isVerified } = req.body; // true for approve, false for reject

    try {
        const result = await db.collection("vehicles").updateOne(
            { carId: req.params.id },
            { $set: { isVerified } }
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

// Monitor active rides
app.get("/api/admin/rides/active", adminOnly, async (req, res) => {
    const db = client.db(dbName);

    const rides = await db.collection("rides")
        .find({ status: "available" })
        .toArray();

    res.json(rides);
});

// Get bookings per ride
app.get("/api/admin/bookings/:rideId", adminOnly, async (req, res) => {
    const db = client.db(dbName);
    const bookings = await db.collection("bookings").find({ rideId: req.params.rideId }).toArray();
    res.json(bookings);
});


// Monitor Transactions or Payments
app.get("/api/admin/payments", adminOnly, async (req, res) => {
    const db = client.db(dbName);
    const payments = await db.collection("payments").find().toArray();
    res.json(payments);
});

// Manage Reports and Complaints
app.get("/api/admin/reports", adminOnly, async (req, res) => {
    const db = client.db(dbName);

    const reports = await db.collection("history")
        .find({ report_description: { $ne: "" } })
        .toArray();

    res.json(reports);
});


app.listen(4000, () => {
    console.log("Admin NodeJS backend running at port 4000");
});

// Debug 
app.get("/api/admin/check", (req, res) => {
    res.json({ session: req.session });
});

