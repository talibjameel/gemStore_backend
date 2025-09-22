const express = require("express");
const router = express.Router();
const pool = require("../Integrations_3rd_Apps/db");
const bcrypt = require("bcrypt");

// Forgot Password Route
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Check if user exists
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Generate a static OTP
    const otp = "4268";

    // 3. Save OTP in DB
    await pool.query("UPDATE users SET otp = $1 WHERE email = $2", [otp, email]);

    // 4. Return OTP (demo only)
    return res.json({
      message: "OTP sent successfully",
      otp: otp
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Verify OTP Route
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Static OTP check
    if (otp === "4268") {
      return res.json({ message: "OTP verified successfully!" });
    } else {
      return res.status(400).json({ message: "Invalid OTP" });
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Update Password Route
router.post("/update-password", async (req, res) => {
    try{
     const { email, newPassword } = req.body;

     console.log("Email:", email, "NewPassword:", newPassword);


     // 1. Check if user exists
         const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

         if (existingUser.rows.length === 0) {
           return res.status(404).json({ message: "User not found" });
         }


     // 2. Encrypt new password
         const salt = await bcrypt.genSalt(10);
         const hashedPassword = await bcrypt.hash(newPassword, salt);


     // 3. Update password
         await pool.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, email]);
         return res.json({ message: "Password updated successfully!" });



    } catch(e){
        console.log(e.message);
            res.status(500).send("Server error");
    }
});

module.exports = router;
