const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { MongoClient } = require("mongodb");
require("dotenv").config({ path: ".env" });

const app = express();
app.use(express.json());
const allowedOrigins = ['http://localhost', 'http://localhost:8080', 'http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like curl or Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      // callback(null, true) tells cors to echo back the requesting origin
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Session
app.use(session({
    secret: "supersecretadminkey",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 60 * 1000, sameSite: "lax", secure: false }
}));

// MongoDB setup
const client = new MongoClient(process.env.MONGO_URL);
const dbName = "carpooling_data";
(async () => {
    try {
        await client.connect();
        console.log("NodeJS connected to MongoDB");
        app.locals.db = client.db(dbName); // set db AFTER connection
    } catch (err) {
        console.error("MongoDB connection failed:", err);
        process.exit(1);
    }
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Admin NodeJS backend running at port ${PORT}`);
});
