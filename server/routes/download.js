const express = require('express');
const crypto = require('crypto');
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const File = require('../models/File');
const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function decryptFile(buffer) {
  const iv = buffer.slice(0, 12);
  const tag = buffer.slice(12, 28);
  const encrypted = buffer.slice(28);
  const key = crypto.scryptSync(process.env.ENCRYPTION_SECRET, 'salt', 32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

router.get('/file/:id', async (req, res) => {
  try {
    const fileDoc = await File.findById(req.params.id);
    if (!fileDoc) return res.status(404).json({ message: 'File not found or expired' });

    if (fileDoc.oneTimeDownload && fileDoc.downloaded) {
      return res.status(410).json({ message: 'File has already been downloaded' });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileDoc.key,
    });

    const s3Response = await s3.send(command);
    const chunks = [];

    for await (const chunk of s3Response.Body) {
      chunks.push(chunk);
    }

    const encryptedBuffer = Buffer.concat(chunks);
    const decryptedBuffer = decryptFile(encryptedBuffer);

    if (fileDoc.oneTimeDownload) {
      fileDoc.downloaded = true;
      await fileDoc.save();

      const delCommand = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileDoc.key,
      });
      await s3.send(delCommand);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${fileDoc.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(decryptedBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to download file' });
  }
});

module.exports = router;
