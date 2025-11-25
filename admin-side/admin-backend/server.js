const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const client = new MongoClient(process.env.MONGO_URI);
const dbName = "CarpoolApp";

async function connectDB() {
    try {
        await client.connect();
        console.log("NodeJS connected to MongoDB");
    } catch (err) {
        console.error("MongoDB error:", err);
    }
}
connectDB();

app.get("/admin/users", async (req, res) => {
    const db = client.db(dbName);
    const users = await db.collection("users").find().toArray();
    res.json(users);
});

app.listen(4000, () => {
    console.log("Admin NodeJS backend running at port 4000");
});

