// test-s3-upload.js
require('dotenv').config();
const fs = require('fs');
const { uploadBuffer } = require('./src/services/s3.service'); // ensure this file exists

(async () => {
  try {
    const buf = fs.readFileSync('./test.jpg'); // put any small JPEG at project root or change path
    const res = await uploadBuffer(buf, 'image/jpeg');
    console.log('Upload success:', res);
  } catch (err) {
    console.error('Upload failed:', err);
  }
})();
