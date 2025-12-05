// src/controllers/order.controller.js
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const generateOrderRef = require('../utils/generateOrderRef');
const { sendOrderConfirmation } = require('../services/mail.service');

/**
 * Place an order
 * Request body:
 * {
 *   items: [ { productId: "<id>", quantity: 2 }, ... ],
 *   metadata?: { ... } // optional
 * }
 *
 * Requires authentication (auth.middleware sets req.user)
 */
/** helper to extract raw id string from various shapes */
function extractIdString(pid) {
  if (!pid && pid !== 0) return null;
  if (typeof pid === 'string') return pid.trim();
  if (typeof pid === 'object') {
    if (pid.$oid && typeof pid.$oid === 'string') return pid.$oid.trim();
    if (pid._id && typeof pid._id === 'string') return pid._id.trim();
    if (pid.id && typeof pid.id === 'string') return pid.id.trim();
    try {
      if (typeof pid.toString === 'function') {
        const s = pid.toString();
        if (s && /^[a-fA-F0-9]{24}$/.test(s)) return s;
      }
    } catch (e) {}
  }
  return null;
}

const placeOrder = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { items, metadata } = req.body;
    console.log('placeOrder called. raw items:', JSON.stringify(items));

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must include items' });
    }

    // Normalize & validate ids
    const normalized = [];
    const invalidInputs = [];

    for (const it of items) {
      const raw = it.productId;
      const idStr = extractIdString(raw);
      if (!idStr || !mongoose.isValidObjectId(idStr)) {
        invalidInputs.push(raw);
      } else {
        normalized.push({ idStr, quantity: Math.max(1, Number(it.quantity || 1)) });
      }
    }

    if (invalidInputs.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more productId is invalid',
        invalidIds: invalidInputs
      });
    }

    // Convert to ObjectId instances (use new)
    const productObjectIds = normalized.map(x => new mongoose.Types.ObjectId(x.idStr));

    // Fetch the products
    const products = await Product.find({ _id: { $in: productObjectIds } }).lean();
    const productMap = products.reduce((acc, p) => { acc[p._id.toString()] = p; return acc; }, {});

    // Check for missing products
    const missing = normalized.filter(n => !productMap[n.idStr]).map(n => n.idStr);
    if (missing.length) {
      return res.status(400).json({ success: false, message: 'Products not found', missing });
    }

    // Build order items with snapshots
    const orderItems = normalized.map(n => {
      const prod = productMap[n.idStr];
      const qty = n.quantity;
      const price = Number(prod.price || 0);
      return {
        productId: prod._id,
        title: prod.title,
        price,
        quantity: qty,
        subtotal: price * qty,
        image: prod.images && prod.images.length ? prod.images[0].url : undefined,
      };
    });

    const total = orderItems.reduce((s, it) => s + it.subtotal, 0);

    // generate unique orderRef (attempt few times)
    let orderRef;
    for (let i = 0; i < 5; i += 1) {
      const candidate = generateOrderRef('ORD');
      // eslint-disable-next-line no-await-in-loop
      const exists = await Order.findOne({ orderRef: candidate }).lean();
      if (!exists) { orderRef = candidate; break; }
    }
    if (!orderRef) orderRef = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const order = await Order.create({
      orderRef,
      userId: user.id,
      userEmail: user.email || '',
      items: orderItems,
      total,
      status: 'pending',
      metadata: metadata || {},
    });

    try {
      if (user.email) {
        await sendOrderConfirmation(user.email, {
          orderRef: order.orderRef,
          items: order.items,
          total: order.total,
          createdAt: order.createdAt
        });
        console.log("Order confirmation email sent to", user.email);
      }
    } catch (err) {
      console.error("Email error:", err.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        id: order._id,
        orderRef: order.orderRef,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
      }
    });
  } catch (err) {
    console.error('placeOrder error', err);
    return next(err);
  }
};

/**
 * Get orders for current user
 * Query params:
 *  - limit, page (optional)
 */
const getUserOrders = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 20));
    const skip = (page - 1) * limit;

    const [orders, count] = await Promise.all([
      Order.find({ userId: user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments({ userId: user.id }),
    ]);

    return res.status(200).json({
      success: true,
      total: count,
      page,
      limit,
      orders,
    });
  } catch (err) {
    console.error('getUserOrders error', err);
    return next(err);
  }
};

module.exports = {
  placeOrder,
  getUserOrders,
};
