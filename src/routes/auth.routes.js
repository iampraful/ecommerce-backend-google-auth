// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { startGoogleAuth, googleAuthCallback, logout } = require('../controllers/auth.controller');

router.get('/google', startGoogleAuth);               // GET /api/auth/google
router.get('/google/callback', googleAuthCallback);   // redirect URI
router.get('/logout', logout);

module.exports = router;
