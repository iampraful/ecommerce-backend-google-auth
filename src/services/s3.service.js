const initAWS = require('../config/aws');
const AWS = initAWS();
const s3 = new AWS.S3();
const { v4: uuidv4 } = require('uuid');

const uploadBuffer = async ({ buffer, originalName, mimetype, folder = 'products' }) => {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw new Error('S3_BUCKET_NAME not set');

  const key = `${folder}/${Date.now()}-${uuidv4()}-${originalName.replace(/\s+/g, '-')}`;

  // Build params WITHOUT ACL by default (modern recommended approach).
  const params = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    // Don't set ACL here — many buckets disallow ACLs ("Bucket owner enforced")
    // ACL: 'public-read',
    // Optionally add CacheControl, ContentDisposition, Metadata, etc.
    CacheControl: 'public, max-age=31536000',
  };

  try {
    const res = await s3.upload(params).promise(); // returns Location, Key, Bucket
    return {
      url: res.Location,
      key: res.Key,
    };
  } catch (err) {
    // If bucket specifically complains about ACLs even though we didn't set it,
    // or if legacy code adds ACL, handle AccessControlListNotSupported by retrying without ACL.
    if (err && err.code === 'AccessControlListNotSupported') {
      // Retry without ACL (we already did that), so just rethrow with a friendly message
      throw new Error('S3 upload failed: bucket does not support ACLs. Upload without ACLs failed.');
    }
    // Bubble up other errors
    throw err;
  }
};

const removeObject = async (key) => {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw new Error('S3_BUCKET_NAME not set');

  const params = { Bucket: bucket, Key: key };
  await s3.deleteObject(params).promise();
};

module.exports = {
  uploadBuffer,
  removeObject,
};
