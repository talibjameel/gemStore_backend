const express = require("express");
const router = express.Router();
const { upload, s3 } = require("../Integrations_3rd_Apps/AWS_S3"); 
const { PutObjectCommand , DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const pool = require("../Integrations_3rd_Apps/db");
const authMiddleware = require("../Auth/middleware");

/// ✅ Get all Banners 
router.get("/allbanners", authMiddleware, async (req, res) => {
    try {
        const data = await pool.query("SELECT * FROM banner");
        res.json(data.rows);
    } catch (error) {
        console.error("Error fetching banners:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Post a new banner
router.post(
  "/addnewbanner",
  authMiddleware,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const { title, description, position, category_id } = req.body;
      const images = req.files;

      // Validate required fields
      if (title || !position || !category_id || !images || images.length === 0) {
        return res.status(400).json({ error: "Title, position, category_id, and at least one image are required" });
      }

      // Validate environment variables
      if (!process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
        console.error("Missing environment variables: AWS_BUCKET_NAME or AWS_REGION");
        return res.status(500).json({ error: "Server configuration error: Missing AWS bucket or region" });
      }

      // Upload images to S3 and collect URLs
      const imageUrls = [];
      for (const image of images) {
        const fileName = `Banner/${Date.now()}-${image.originalname}`;
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileName,
          Body: image.buffer,
          ContentType: image.mimetype,
        };
        await s3.send(new PutObjectCommand(params));
        imageUrls.push(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`);
      }

      // Insert banner into database
      const newBanner = await pool.query(
        `INSERT INTO banner 
          (title, description, position, category_id, banner_img)
         VALUES 
          ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          title,
          description || null,
          position,
          category_id,
          JSON.stringify(imageUrls),
        ]
      );

      res.status(201).json({
        message: "✅ Banner created successfully",
        banner: newBanner.rows[0],
      });
    } catch (err) {
      console.error("❌ Error while creating banner:", err.message);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/// ✅ Get a single Banner
router.get("/banner/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const bannerResult = await pool.query("SELECT * FROM banner WHERE id = $1", [id]);
        const banner = bannerResult.rows[0];

        if (!banner) {
            return res.status(404).json({ error: "Banner not found" });
        }

        res.json(banner);
    } catch (error) {
        console.error("Error fetching banner:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Delete a Banner
router.delete("/deletebanner/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        // Validate environment variables
        if (!process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
            console.error("Missing environment variables: AWS_BUCKET_NAME or AWS_REGION");
            return res.status(500).json({ error: "Server configuration error: Missing AWS bucket or region" });
        }

        // Fetch the banner to get image URLs
        const bannerResult = await pool.query("SELECT banner_img FROM banner WHERE id = $1", [id]);
        const banner = bannerResult.rows[0];

        if (!banner) {
            return res.status(404).json({ error: "Banner not found" });
        }

        // Handle banner_img (jsonb field, may already be parsed)
        let imageUrls = [];
        if (typeof banner.banner_img === 'string') {
            try {
                imageUrls = JSON.parse(banner.banner_img);
            } catch (parseError) {
                console.error("Error parsing banner_img JSON:", parseError);
                return res.status(500).json({ error: "Invalid banner image data" });
            }
        } else if (Array.isArray(banner.banner_img)) {
            imageUrls = banner.banner_img;
        }

        // Validate imageUrls is an array of strings
        if (!Array.isArray(imageUrls) || !imageUrls.every(url => typeof url === 'string')) {
            console.error("Invalid banner_img format: not an array of strings");
            return res.status(500).json({ error: "Invalid banner image data" });
        }

        // Delete images from S3
        for (const url of imageUrls) {
            const key = url.replace(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`, '');
            const deleteParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
            };
            await s3.send(new DeleteObjectCommand(deleteParams));
        }

        // Delete banner from database
        await pool.query("DELETE FROM banner WHERE id = $1", [id]);

        res.json({ 
            message: "Banner deleted successfully",
            deletedBannerId: id,
            
         });

    } catch (error) {
        console.error("Error deleting banner:", error);
        res.status(500).json({ error: "Internal server error" });
    }   
});





module.exports = router;