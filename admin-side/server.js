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

// Session setup
app.use(session({
    secret: "supersecretadminkey", // change to a secure random string
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 60 * 1000  } // set true if using https
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

// Protiect all admin routes
function adminOnly(req, res, next) {
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

// Example: check session
app.get("/api/admin/dashboard", (req, res) => {
    if (!req.session.admin) {
        return res.status(401).json({ message: "Not logged in" });
    }
    res.json({ message: "Welcome, " + req.session.admin.name });
});

// Fetch all users
app.get("/api/admin/users/:id", adminOnly, async (req, res) => {
    const db = client.db(dbName);
    const user = await db.collection("users").findOne({ userID: req.params.id });
    res.json(user);
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

// Approve a vehicle
app.patch("/api/admin/vehicles/:id/approve", adminOnly, async (req, res) => {
    const db = client.db(dbName);

    await db.collection("vehicles").updateOne(
        { carId: req.params.id },
        { $set: { isVerified: true } }
    );

    res.json({ message: "Vehicle approved" });
});

// Monitor active rides
app.get("/api/admin/rides/active", adminOnly, async (req, res) => {
    const db = client.db(dbName);

    const rides = await db.collection("rides")
        .find({ status: "available" })
        .toArray();

    res.json(rides);
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
