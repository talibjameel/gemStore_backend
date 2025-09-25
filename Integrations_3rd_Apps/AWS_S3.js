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

module.exports = { s3, upload };