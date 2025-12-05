const express = require('express');
const router = express.Router();

const { ensureAuthenticated } = require('../middlewares/auth.middleware'); // <--- destructure function
const orderController = require('../controllers/order.controller');

// Place order (authenticated)
router.post('/', ensureAuthenticated, orderController.placeOrder);

// Get user's orders (authenticated)
router.get('/', ensureAuthenticated, orderController.getUserOrders);

module.exports = router;
