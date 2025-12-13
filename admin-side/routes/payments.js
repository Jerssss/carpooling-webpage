const express = require("express");
const router = express.Router();
const { adminOnly } = require("../middlewares/auth");

// All payments
router.get("/", adminOnly, async (req, res) => {
    const db = req.app.locals.db;
    const payments = await db.collection("payments").find().toArray();
    res.json(payments);
});

module.exports = router;
