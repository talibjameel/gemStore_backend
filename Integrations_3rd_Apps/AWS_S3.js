const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");

require("dotenv").config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Log AWS config
console.log("AWS CONFIG:", {
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_BUCKET_NAME,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID?.slice(0, 4) + "...",
  secretKey: process.env.AWS_SECRET_ACCESS_KEY ? "✅ Loaded" : "❌ Missing",
});

// Middleware for JWT auth
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Token missing" });

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};


// 📌 Upload file
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

// 📌 Delete file
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

// 📌 List all files
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