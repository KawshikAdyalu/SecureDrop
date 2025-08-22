const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL index to auto-delete expired docs
  },
  oneTimeDownload: {
    type: Boolean,
    default: true,
  },
  downloaded: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

const File = mongoose.model('File', fileSchema);

module.exports = File;
