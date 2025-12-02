// app.js
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const productRoutes = require('./src/routes/product.routes');
const authRoutes = require('./src/routes/auth.routes');
// const orderRoutes = require('./src/routes/order.routes');
// const { errorHandler } = require('./src/middlewares/error.middleware');

const app = express();

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware (NEEDED for Google OAuth)
app.use(session({
  genid: () => uuidv4(),
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // change to true in production + https
    sameSite: 'lax'
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
// app.use('/api/orders', orderRoutes);

// quick profile route for manual test
app.get('/profile', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.send(`<h3>Not logged in</h3><a href="/api/auth/google">Sign in with Google</a>`);
  }
  const u = req.session.user;
  res.send(`<h3>Logged in as ${u.name}</h3><p>${u.email}</p><img src="${u.picture || ''}" width="100"/><p><a href="/api/auth/logout">Logout</a></p>`);
});


// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Error handler (should be last)
// app.use(errorHandler);

module.exports = app;
