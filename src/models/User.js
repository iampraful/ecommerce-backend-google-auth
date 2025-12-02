// src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, index: true, unique: true, sparse: true },
  name: String,
  email: { type: String, index: true, unique: true, sparse: true },
  picture: String,
  emailVerified: { type: Boolean, default: false },
  locale: String
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
