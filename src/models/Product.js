const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  key: { type: String, required: true }, // S3 Key for deletion
  order: { type: Number, default: 0 }, // ordering index
});

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, index: true },
  price: { type: Number, required: true },
  images: { type: [ImageSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

ProductSchema.methods.getOrderedImages = function () {
  return this.images.sort((a, b) => a.order - b.order);
};

module.exports = mongoose.model('Product', ProductSchema);
