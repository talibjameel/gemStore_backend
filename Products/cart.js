const express = require("express");
const router = express.Router();
const { upload, s3 } = require("../Integrations_3rd_Apps/AWS_S3"); 
const { PutObjectCommand , DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const pool = require("../Integrations_3rd_Apps/db");
const authMiddleware = require("../Auth/middleware");

// 📦 Get all products in user's cart
router.get("/cart", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; 

    const query = `
      SELECT 
        c.id AS cart_id,
        p.name AS title,
        p.price,
        p.product_img,
        c.color,
        c.size,
        c.quantity
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = $1
    `;

    const result = await pool.query(query, [userId]);

    res.status(200).json({
      success: true,
      total_price: result.rows.reduce((total, item) => total + item.price * item.quantity, 0),
      data: result.rows,
    });
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

 

// 📦 Add product to cart (accepts multipart/form-data fields)
router.post("/cart/addItem", authMiddleware, upload.none(), async (req, res) => {
  try {
    console.log("Request Headers:", req.headers["content-type"]);
    console.log("Request Body (after multer):", req.body);

    const userId = req.user.id;
    // If fields came as strings (form-data), convert numeric fields:
    const product_id = req.body.product_id ? Number(req.body.product_id) : undefined;
    const quantity = req.body.quantity ? Number(req.body.quantity) : 1;
    const color = req.body.color ?? null;
    const size = req.body.size ?? null;

    if (!product_id) {
      return res.status(400).json({ success: false, message: "product_id is required" });
    }

    // product exists
    const productCheck = await pool.query(`SELECT * FROM products WHERE id = $1`, [product_id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const check = await pool.query(
      `SELECT * FROM cart WHERE user_id=$1 AND product_id=$2 AND color IS NOT DISTINCT FROM $3 AND size IS NOT DISTINCT FROM $4`,
      [userId, product_id, color, size]
    );

    if (check.rows.length > 0) {
      await pool.query(
        `UPDATE cart 
         SET quantity = quantity + $1 
         WHERE user_id=$2 AND product_id=$3 AND color IS NOT DISTINCT FROM $4 AND size IS NOT DISTINCT FROM $5`,
        [quantity, userId, product_id, color, size]
      );

      return res.status(200).json({ success: true, message: "Quantity updated successfully" });
    }

    await pool.query(
      `INSERT INTO cart (user_id, product_id, quantity, color, size)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, product_id, quantity, color, size]
    );

    return res.status(201).json({ success: true, message: "Product added to cart successfully" });
  } catch (err) {
    console.error("❌ Error adding to cart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// 🗑️ Delete product from cart using cart_id
router.delete("/cart/deleteItem", authMiddleware, upload.none(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { cart_id } = req.body;

    // 🧾 Input validation
    if (!cart_id) {
      return res.status(400).json({
        success: false,
        message: "cart_id is required",
      });
    }

    // 🔍 Check if the cart item exists for this user
    const check = await pool.query(
      `SELECT * FROM cart WHERE id = $1 AND user_id = $2`,
      [cart_id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found or does not belong to this user",
      });
    }

    // 🗑️ Delete the cart item
    await pool.query(`DELETE FROM cart WHERE id = $1 AND user_id = $2`, [cart_id, userId]);

    

    return res.status(200).json({
      success: true,
      message: `Product removed from cart successfully `,
    });
  } catch (err) {
    console.error("❌ Error deleting from cart:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// 🛒 Update product quantity, shipping cost, or address in cart
router.put("/cart/updateItem", authMiddleware, upload.none(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { cart_id, quantity, shipping_cost, shipping_address } = req.body;

    // ✅ validation
    if (!cart_id || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "cart_id and quantity are required",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero",
      });
    }

    // ✅ check if cart item exists
    const check = await pool.query(
      `SELECT * FROM cart WHERE id = $1 AND user_id = $2`,
      [cart_id, userId]
    );
    if (check.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }

    // ✅ fallback for shipping cost & address
    const shipping = shipping_cost
      ? Number(shipping_cost)
      : check.rows[0].shipping_cost;
    const address = shipping_address
      ? shipping_address
      : check.rows[0].shipping_address;

    // ✅ update cart item
    await pool.query(
      `UPDATE cart 
       SET quantity = $1, shipping_cost = $2, shipping_address = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5`,
      [quantity, shipping, address, cart_id, userId]
    );

    return res
      .status(200)
      .json({ success: true, message: "Cart item updated successfully" });
  } catch (err) {
    console.error("❌ Error updating cart item:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


/// clear whole personal cart after order is placed
router.delete("/cart/clear", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("🟢 Debug: Request to clear cart for user_id:", userId);

    const result = await pool.query(`DELETE FROM cart WHERE user_id = $1 RETURNING *`, [userId]);

    console.log(`🟢 Debug: Number of cart items deleted: ${result.rowCount}`);
    console.log("Deleted rows:", result.rows);

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
    });
  } catch (err) {
    console.error("❌ Error clearing cart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});





module.exports = router;