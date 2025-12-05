// src/middlewares/auth.middleware.js

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    // Attach user info for convenience (important for orders)
    const u = req.session.user;

    req.user = {
      id: u._id || u.id,            // Google auth stored _id or id
      email: u.email,
      name: u.name,
      picture: u.picture || null,
    };

    return next();
  }

  return res.status(401).json({
    success: false,
    message: "Unauthorized. Please sign in."
  });
}

module.exports = { ensureAuthenticated };
