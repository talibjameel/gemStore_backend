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

// ✅ Protected Product Route
router.get("/categories", authMiddleware, async (req, res) => {
  try {
    // fetching products from DB
    const data = await pool.query("SELECT * FROM categories");
    console.log("✅ Products fetched:", data.rows);

    res.json({
      message: "Categories fetched successfully ✅",
      categories: data.rows,
    });
  } catch (e) {
    console.error("❌ Error while fetching Products:", e.message);
    res.status(500).send("Server error");
  }
});

// ✅ Fetch category with its products
router.get("/categories/:id", authMiddleware, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // 1. Fetch the category by ID
    const categoryResult = await pool.query(
      "SELECT * FROM categories WHERE id = $1",
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ message: "Category not found ❌" });
    }

    // 2. Fetch products for this category
    const productsResult = await pool.query(
      "SELECT * FROM products WHERE category_id = $1",
      [categoryId]
    );

    console.log("✅ Category fetched:", categoryResult.rows[0]);
    console.log("✅ Products fetched:", productsResult.rows);

    // 3. Send combined response
    res.json({
      message: "Category and its products fetched successfully ✅",
      category: categoryResult.rows[0],
      products: productsResult.rows,
    });

  } catch (e) {
    console.error("❌ Error while fetching category & products:", e.message);
    res.status(500).send("Server error");
  }
});

// ✅ Fetch product by ID
// ✅ Get only products by categoryId
router.get("/products/category/:id", authMiddleware, async (req, res) => {
  try {
    const categoryId = req.params.id;

    const productsResult = await pool.query(
      "SELECT * FROM products WHERE category_id = $1",
      [categoryId]
    );

    if (productsResult.rows.length === 0) {
      return res.status(404).json({ message: "No products found for this category ❌" });
    }

    res.json({
      message: "Products fetched successfully ✅",
      products: productsResult.rows,
    });
  } catch (e) {
    console.error("❌ Error while fetching products:", e.message);
    res.status(500).send("Server error");
  }
});



module.exports = router;
