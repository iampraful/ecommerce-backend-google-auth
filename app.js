// app.js
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const errorHandler = require('./src/middlewares/error.middleware');
const orderRoutes = require('./src/routes/order.routes');
const { ensureAuthenticated } = require('./src/middlewares/auth.middleware');

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
app.use('/api/orders', orderRoutes);

// quick profile route for manual test
app.get('/profile', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.send(`<h3>Not logged in</h3><a href="/api/auth/google">Sign in with Google</a>`);
  }
  const u = req.session.user;
  res.send(`<h3>Logged in as ${u.name}</h3><p>${u.email}</p><img src="${u.picture || ''}" width="100"/><p><a href="/api/auth/logout">Logout</a></p>`);
});

app.post('/dev/login', (req, res) => {
  req.session.user = {
    id: '000000000000000000000001',
    email: 'dev@example.com',
    name: 'Dev User'
  };
  res.json({ success: true, message: 'Dev login created' });
});

// DEBUG logger — place this AFTER `app.use(session(...))`
app.use((req, res, next) => {
  console.log('----- Incoming request -----');
  console.log('URL:', req.originalUrl);
  console.log('Headers Cookie:', req.headers.cookie); // shows Cookie header sent by client
  console.log('Session object present?:', !!req.session);
  if (req.session) {
    // print only keys so the console isn't noisy
    console.log('Session keys:', Object.keys(req.session));
  }
  next();
});


// dev test route to inspect req.user after auth middleware
app.get('/api/me', ensureAuthenticated, (req, res) => {
  console.log('req.session.user:', req.session && req.session.user);
  res.json({ loggedInUser: req.user || req.session.user });
});


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
app.use(errorHandler);

module.exports = app;
