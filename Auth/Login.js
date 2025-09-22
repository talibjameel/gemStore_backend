const express = require("express");
const router = express.Router();
const pool = require("../Integrations_3rd_Apps/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();


console.log(process.env.JWT_SECRET);
console.log(process.env.PORT);

// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 3. Generate JWT Token
    const jwt_token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET,
    );

    // 4. Send Response
    res.json({
      message: "Login successful 🚀",
      jwt_token,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
      },
    });

    console.log("✅ User logged in:", user.rows[0].email);

  } catch (err) {
    console.error("❌ Error in login:", err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
