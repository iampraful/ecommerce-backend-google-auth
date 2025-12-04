const Product = require('../models/Product');
const { uploadBuffer, removeObject } = require('../services/s3.service');

/**
 * createProduct
 * Accepts multipart/form-data:
 * - fields: title, description, category, price
 * - optional field imageOrder: JSON array of indices specifying order, e.g. [2,0,1]
 */
const createProduct = async (req, res, next) => {
  try {
    const { title, description, category, price } = req.body;

    // Required checks for assignment
    if (!title || !description || !category || !price) {
      return res.status(400).json({
        success: false,
        message: "Title, description, category and price are required",
      });
    }

    let images = [];

    if (req.files && req.files.length > 0) {
      const uploads = req.files.map((file, idx) =>
        uploadBuffer({
          buffer: file.buffer,
          originalName: file.originalname,
          mimetype: file.mimetype,
          folder: "products",
        }).then((s3) => ({
          url: s3.url,
          key: s3.key,
          order: idx,
        }))
      );

      images = await Promise.all(uploads);
    } else if (req.body.images) {
      let parsed;
      try {
        parsed =
          typeof req.body.images === "string"
            ? JSON.parse(req.body.images)
            : req.body.images;
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "Invalid images JSON",
        });
      }

      images = parsed.map((img, idx) => ({
        url: img.url,
        key: img.key,
        order: img.order ?? idx,
      }));
    }

    if (!images || images.length < 2) {
      return res.status(400).json({
        success: false,
        message: "A product must have at least 2 images",
      });
    }

    // Create product
    const product = await Product.create({
      title,
      description,
      category,
      price,
      images,
    });

    return res.status(200).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    console.error("Create Product Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

const listProducts = async (req, res, next) => {
  try {
    const products = await Product.find().lean();
    const normalized = products.map((p) => ({
      ...p,
      images: p.images.sort((a, b) => a.order - b.order),
    }));
    res.json(normalized);
  } catch (err) {
    next(err);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.images = product.images.sort((a, b) => a.order - b.order);
    res.json(product);
  } catch (err) {
    next(err);
  }
};

/**
 * updateProduct
 * - fields: title, description, category, price
 * - files: images[] (optional) => if provided, they'll be appended (or we can replace depending on use-case)
 * - body: imageOrder (JSON array of image keys or indices) - recommended approach: client sends array of existing image keys in desired order.
 * - body: removeImageKeys (JSON array of image keys to delete)
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const { title, description, category, price } = req.body;
    if (title) product.title = title;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = Number(price);

    // handle removals
    if (req.body.removeImageKeys) {
      let toRemove;
      try {
        toRemove = JSON.parse(req.body.removeImageKeys);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid removeImageKeys JSON' });
      }
      for (const key of toRemove) {
        // remove from S3
        await removeObject(key).catch((e) => console.warn('S3 delete failed', e));
        // remove from product.images
        product.images = product.images.filter((img) => img.key !== key);
      }
    }

    // upload new images and append
    if (req.files && req.files.length > 0) {
      const startIndex = product.images.length;
      const uploadPromises = req.files.map((file, idx) =>
        uploadBuffer({
          buffer: file.buffer,
          originalName: file.originalname,
          mimetype: file.mimetype,
          folder: 'products',
        }).then((s3res) => ({
          url: s3res.url,
          key: s3res.key,
          order: startIndex + idx,
        }))
      );
      const newImages = await Promise.all(uploadPromises);
      product.images = product.images.concat(newImages);
    }

    // reorder images if imageOrder provided. Expecting array of keys in desired order:
    if (req.body.imageOrder) {
      let orderArr;
      try {
        orderArr = JSON.parse(req.body.imageOrder);
        // orderArr is an array of image keys in desired order
        const imageMap = product.images.reduce((acc, im) => {
          acc[im.key] = im;
          return acc;
        }, {});
        const reordered = orderArr.map((key, idx) => {
          const im = imageMap[key];
          if (!im) throw new Error('Invalid image key in imageOrder');
          return { ...im, order: idx };
        });
        product.images = reordered;
      } catch (err) {
        return res.status(400).json({ message: 'Invalid imageOrder or image keys not found' });
      }
    } else {
      // ensure orders are consecutive
      product.images = product.images
        .sort((a, b) => a.order - b.order)
        .map((im, idx) => ({ ...im, order: idx }));
    }

    await product.save();
    res.json(product);
  } catch (err) {
    next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // delete images from S3
    await Promise.all(
      product.images.map((img) =>
        removeObject(img.key).catch((e) => console.warn('S3 delete failed', e))
      )
    );

    await product.remove();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
