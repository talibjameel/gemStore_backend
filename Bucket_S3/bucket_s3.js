const express = require("express");
const router = express.Router(); 
const { upload, s3 } = require("../Integrations_3rd_Apps/AWS_S3"); 
const { PutObjectCommand , DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const authMiddleware = require("../Auth/middleware");


// 📌 Upload image
router.post("/upload",authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileName = `${Date.now()}-${req.file.originalname}`;

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    res.json({ message: "✅ File uploaded successfully", url: fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 Delete image
router.delete("/delete/:key",authMiddleware, async (req, res) => {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: req.params.key,
      })
    );
    res.json({ message: "🗑️ File deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 List all images
router.get("/files",authMiddleware, async (req, res) => {
  try {
    const data = await s3.send(
      new ListObjectsV2Command({ Bucket: process.env.AWS_BUCKET_NAME })
    );

    const files = (data.Contents || []).map((item) => ({
      key: item.Key,
      url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
    }));

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log(err);
  }
});

module.exports = router;