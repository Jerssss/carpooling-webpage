const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { MongoClient } = require("mongodb");
require("dotenv").config({ path: ".env" });

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:8888", credentials: true }));

// Session
app.use(session({
    secret: "supersecretadminkey",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 60 * 1000, sameSite: "lax", secure: false }
}));

// MongoDB setup
const client = new MongoClient(process.env.MONGO_URI);
const dbName = "carpooling_data";
(async () => {
    await client.connect();
    console.log("NodeJS connected to MongoDB");
})();
app.locals.db = client.db(dbName);

// Test route
app.get("/api/test", (req, res) => res.json({ message: "Server working" }));

// Routers
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/users");
const vehicleRoutes = require("./routes/vehicles");
const rideRoutes = require("./routes/rides");
const paymentRoutes = require("./routes/payments");
const reportRoutes = require("./routes/reports");

app.use("/api/admin", adminRoutes);
app.use("/api/admin/users", userRoutes);
app.use("/api/admin/vehicles", vehicleRoutes);
app.use("/api/admin/rides", rideRoutes);
app.use("/api/admin/payments", paymentRoutes);
app.use("/api/admin/reports", reportRoutes);

app.listen(4000, () => console.log("Admin NodeJS backend running at port 4000"));
