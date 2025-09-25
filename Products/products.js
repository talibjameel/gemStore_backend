const express = require("express");
const router = express.Router();
const { upload, s3 } = require("../Integrations_3rd_Apps/AWS_S3"); 
const { PutObjectCommand , DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const pool = require("../Integrations_3rd_Apps/db");
const authMiddleware = require("../Auth/middleware");


// ✅ Post a new product (with S3 upload)
router.post(
  "/addProducts",
  authMiddleware,
  upload.single("product_img"),
  async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        sku,
        category_id,
        size,
        colors,
        stock,
        rating,
        is_featured,
        is_recommended,
        top_collection,
      } = req.body;

      let productImgUrl = null;

      // ✅ Agar image aya hai to S3 pe upload karo
      if (req.file) {
        const fileName = `products/${Date.now()}-${req.file.originalname}`;
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        };
        await s3.send(new PutObjectCommand(params));
        productImgUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      }

      // ✅ DB insert query (saare fields)
      const newProduct = await pool.query(
        `INSERT INTO products (name, description, price, sku, category_id, size, colors, stock, rating, is_featured, is_recommended, top_collection, product_img)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          name,
          description,
          price,
          sku,
          category_id,
          size,
          colors,
          stock || 0,
          rating || 0,
          is_featured || false,
          is_recommended || false,
          top_collection || false,
          productImgUrl,
        ]
      );

      res.status(201).json({
        message: "✅ Product created successfully",
        product: newProduct.rows[0],
      });
    } catch (err) {
      console.error("❌ Error while creating product:", err.message);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ✅ Get products by id 
router.get("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    // fetch product
    const productResult = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

    res.json({
      message: "Data fetched successfully ✅",
      product: productResult.rows[0],
    });
  } catch (e) {
    console.error("❌ Error while fetching product:", e.message);
    res.status(500).send("Server error");
  }
});

// Delete a product by id
router.delete("/products/:id", authMiddleware, async (req, res) => {
  try {
    const productId = req.params.id;

    // delete product
    const deleteResult = await pool.query(
      "DELETE FROM products WHERE id = $1",
      [productId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

    res.json({ message: "Product deleted successfully ✅" });
  } catch (e) {
    console.error("❌ Error while deleting product:", e.message);
    res.status(500).send("Server error");
  }
});

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