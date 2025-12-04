const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const multer = require('multer');

// Using memoryStorage so files are not written locally
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * POST /api/products
 * - multipart/form-data
 * - images: files named "images"
 * - fields: title, description, category, price, imageOrder (JSON)
 */
router.post('/createProduct', upload.array('images', 10), productController.createProduct);

/**
 * GET /api/products
 */
router.get('/', productController.listProducts);

/**
 * GET /api/products/:id
 */
router.get('/:id', productController.getProduct);

/**
 * PATCH /api/products/:id
 * - multipart/form-data optional images
 * - body: removeImageKeys (JSON array of keys), imageOrder (JSON array of keys)
 */
router.patch('/:id', upload.array('images', 10), productController.updateProduct);

/**
 * DELETE /api/products/:id
 */
router.delete('/:id', productController.deleteProduct);

module.exports = router;
