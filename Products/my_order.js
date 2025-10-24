const express = require("express");
const router = express.Router();
const { upload, s3 } = require("../Integrations_3rd_Apps/AWS_S3"); 
const { PutObjectCommand , DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const pool = require("../Integrations_3rd_Apps/db");
const authMiddleware = require("../Auth/middleware");

// 🛒 Place an order
router.post("/place_order", authMiddleware, upload.none(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { sub_total, shipping_cost, status } = req.body;

    if (!sub_total) {
      return res.status(400).json({ success: false, message: "sub_total is required" });
    }

    await pool.query("BEGIN");

    // ✅ Fetch only required product fields
    const cartResult = await pool.query(
      `SELECT 
        p.name,
        c.quantity,
        p.price
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = $1`,
      [userId]
    );

    if (cartResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Cart is empty!" });
    }

    const detailsOfProducts = JSON.stringify(cartResult.rows); // ✅ fix JSONB error

    // ✅ Insert order
    const order = await pool.query(
      `INSERT INTO my_orders 
        (user_id, subtotal, shipping_cost, status, details_of_products)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, order_number`,
      [userId, sub_total, shipping_cost || 0, status || "Pending", detailsOfProducts]
    );

    const orderId = order.rows[0].id;
    const orderNumber = order.rows[0].order_number;

    // ✅ Clear cart
    await pool.query(`DELETE FROM cart WHERE user_id = $1`, [userId]);

    await pool.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order_id: orderId,
      order_number: orderNumber,

    });

  } catch (err) {
    console.error("❌ Error placing order:", err);
    await pool.query("ROLLBACK");
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/// View user's orders
router.get("/my_orders", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const ordersResult = await pool.query(
      `SELECT id, order_number, subtotal, shipping_cost, status, details_of_products, created_at
       FROM my_orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      orders: ordersResult.rows,
    });

  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});




module.exports = router;