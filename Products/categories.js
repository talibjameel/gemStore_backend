const express = require("express");
const router = express.Router();
const pool = require("../Integrations_3rd_Apps/db");
const authMiddleware = require("../Auth/middleware");


// ✅ Main categories fetch route
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

// ✅ Fetch all products with products_category = 'dress'
router.get("/subcategories/dress", authMiddleware, async (req, res) => {
  try {
    // ✅ fetching products from DB where products_category = 'dress'
    const data = await pool.query(
      "SELECT * FROM products WHERE products_category = $1",
      ['dress']
    );

    console.log("✅ Products fetched:", data.rows);

    res.json({
      message: "Products fetched successfully ✅",
      products: data.rows,
    });
  } catch (e) {
    console.error("❌ Error while fetching Products:", e.message);
    res.status(500).send("Server error");
  }
});

// ✅ Fetch all products with is_featured = true
router.get("/products/featured", authMiddleware, async (req, res) => {
  try {
    // ✅ fetching products from DB where is_featured = true
    const data = await pool.query(
      "SELECT * FROM products WHERE is_featured = $1",
      [true]
    );

    console.log("✅ Products fetched:", data.rows);

    res.json({
      message: "Products fetched successfully ✅",
      products: data.rows,
    });
  } catch (e) {
    console.error("❌ Error while fetching Products:", e.message);
    res.status(500).send("Server error");
  }
});

// ✅ Fetch all products with is_recommended = true
router.get("/products/recommended", authMiddleware, async (req, res) => {
  try {
    // ✅ fetching products from DB where is_recommended = true
    const data = await pool.query(
      "SELECT * FROM products WHERE is_recommended = $1",
      [true]
    );

    console.log("✅ Products fetched:", data.rows);

    res.json({
      message: "Products fetched successfully ✅",
      products: data.rows,
    });
  } catch (e) {
    console.error("❌ Error while fetching Products:", e.message);
    res.status(500).send("Server error");
  }
});

// ✅ Fetch all products with top_collection =  true
router.get("/products/topCollection", authMiddleware, async (req, res) => {
  try {
    // ✅ fetching products from DB where top_collection = true
    const data = await pool.query(
      "SELECT * FROM products WHERE top_collection = $1",
      [true]
    );

    console.log("✅ Products fetched:", data.rows);

    res.json({
      message: "Products fetched successfully ✅",
      products: data.rows,
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




module.exports = router;
