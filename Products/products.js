const express = require("express");
const router = express.Router();
const pool = require("../Integrations_3rd_Apps/db");
const jwt = require("jsonwebtoken");

// Middleware for JWT auth
const authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};



// ✅ Get products + banners by categoryId
router.get("/products/category/:id", authMiddleware, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // fetch products
    const productsResult = await pool.query(
      "SELECT * FROM products WHERE category_id = $1",
      [categoryId]
    );

    // fetch banners
    const bannersResult = await pool.query(
      "SELECT * FROM banner WHERE category_id = $1",
      [categoryId]
    );

    if (productsResult.rows.length === 0 && bannersResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No products or banners found for this category ❌" });
    }

    res.json({
      message: "Data fetched successfully ✅",
      banners: bannersResult.rows,
      products: productsResult.rows,
       
    });
  } catch (e) {
    console.error("❌ Error while fetching category data:", e.message);
    res.status(500).send("Server error");
  }
});


module.exports = router;