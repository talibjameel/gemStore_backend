const express = require("express");
const router = express.Router();
const pool = require("../Integrations_3rd_Apps/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Check if user exists
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not registered, kindly go to registration screen.",
      });
    }

    const user = userResult.rows[0];

    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect, please try again.",
      });
    }

    // 3️⃣ Generate JWT Token
    const jwt_token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      // { expiresIn: "7d" } // optional: add token expiry
    );

    // 4️⃣ Send Response
    res.status(200).json({
      success: true,
      message: "Login successful 🚀",
      jwt_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

    console.log("✅ User logged in:", user.email);

  } catch (err) {
    console.error("❌ Error in login:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

module.exports = router;
