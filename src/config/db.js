// src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce_db';
  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected: ${uri}`);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
};

module.exports = { connectDB, mongoose };
