const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const File = require('../models/File');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });
const BASE_URL='https://securedrop-ne4k.onrender.com'
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function encryptFile(buffer) {
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(process.env.ENCRYPTION_SECRET, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]);
}

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const encryptedBuffer = encryptFile(req.file.buffer);

    const fileKey = crypto.randomBytes(16).toString('hex');

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Body: encryptedBuffer,
    });

    await s3.send(command);

    const fileDoc = new File({
      key: fileKey,
      originalName: req.file.originalname,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      oneTimeDownload: true,
    });

    await fileDoc.save();

    res.json({
      message: 'File uploaded successfully',
      downloadLink: `${BASE_URL}/api/file/${fileDoc._id}`,  // fixed here
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

module.exports = router;
