require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const uploadRoute = require('./routes/upload');
const downloadRoute = require('./routes/download');
const cors = require('cors');


const app = express();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
app.use(cors());
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per IP
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(limiter);

app.use(express.json());

app.use('/api', uploadRoute);
app.use('/api', downloadRoute);

app.get('/', (req, res) => {
  res.send('SecureDrop Backend API is running');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
