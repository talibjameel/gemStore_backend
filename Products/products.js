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
        products_category, 
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
        `INSERT INTO products 
          (name, description, price, sku, category_id, size, colors, stock, rating, 
           is_featured, is_recommended, top_collection, product_img, products_category)
         VALUES 
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
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
          products_category || null, 
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

// ✅ Update existing product
router.put(
  "/updateProduct/:id", // product id path param
  authMiddleware,
  upload.single("product_img"), // optional image update
  async (req, res) => {
    try {
      const { id } = req.params;
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
        products_category,
      } = req.body;

      let productImgUrl = null;

      // ✅ Agar new image aya to S3 pe upload karo
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

      // ✅ DB update query
      const updatedProduct = await pool.query(
        `UPDATE products
         SET
           name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           sku = COALESCE($4, sku),
           category_id = COALESCE($5, category_id),
           size = COALESCE($6, size),
           colors = COALESCE($7, colors),
           stock = COALESCE($8, stock),
           rating = COALESCE($9, rating),
           is_featured = COALESCE($10, is_featured),
           is_recommended = COALESCE($11, is_recommended),
           top_collection = COALESCE($12, top_collection),
           product_img = COALESCE($13, product_img),
           products_category = COALESCE($14, products_category)
         WHERE id = $15
         RETURNING *`,
        [
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
          productImgUrl,
          products_category,
          id,
        ]
      );

      if (updatedProduct.rows.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.status(200).json({
        message: "✅ Product updated successfully",
        product: updatedProduct.rows[0],
      });
    } catch (err) {
      console.error("❌ Error while updating product:", err.message);
      res.status(500).json({ error: "Server error" });
    }
  }
);


// ✅ Get products by id 
router.get("/products/:id",authMiddleware, async (req, res) => {
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