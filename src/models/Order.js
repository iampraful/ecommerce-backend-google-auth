const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true },        // price * quantity
  image: { type: String },
});

const OrderSchema = new mongoose.Schema({
  orderRef: { type: String, required: true, index: { unique: true } },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, required: true },
  items: { type: [OrderItemSchema], required: true },
  total: { type: Number, required: true },
  status: { type: String, default: 'pending' },     // pending, paid, shipped, cancelled...
  createdAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed },   // optional extra info
});

module.exports = mongoose.model('Order', OrderSchema);
