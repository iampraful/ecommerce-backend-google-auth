// src/controllers/auth.controller.js
const { v4: uuidv4 } = require('uuid');
const googleService = require('../services/google.service');
const User = require('../models/User');

const startGoogleAuth = (req, res) => {
  const state = uuidv4();
  req.session.oauth_state = state;
  const url = googleService.getAuthUrl(state);
  return res.redirect(url);
};

const googleAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing code');
    if (!state || state !== req.session.oauth_state) {
      return res.status(400).send('Invalid state');
    }
    delete req.session.oauth_state;

    const tokenData = await googleService.exchangeCodeForTokens(code);
    if (!tokenData.id_token) throw new Error('No id_token returned');

    const payload = await googleService.verifyIdToken(tokenData.id_token);
    const googleId = payload.sub;

    const userObj = {
      googleId,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified || false,
      locale: payload.locale || null
    };

    // if refresh token returned (only on first consent), store it
    if (tokenData.refresh_token) userObj.refreshToken = tokenData.refresh_token;

    // upsert user (Mongoose)
    const filter = { googleId };
    const update = { $set: userObj };
    const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
    const user = await User.findOneAndUpdate(filter, update, opts).lean();

    // store minimal session user
    req.session.user = {
      id: user._id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture
    };

    // redirect to profile or your frontend route
    return res.redirect('/profile');
  } catch (err) {
    console.error('Google callback error:', err);
    return res.status(500).send('Authentication failed: ' + err.message);
  }
};

const logout = (req, res) => {
  req.session.destroy(() => res.redirect('/'));
};

module.exports = { startGoogleAuth, googleAuthCallback, logout };
