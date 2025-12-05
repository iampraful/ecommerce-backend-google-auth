// Example format: ORD-20251205-6F3A2B (ORD-YYYYMMDD-RAND6)
const crypto = require('crypto');

function generateOrderRef(prefix = 'ORD') {
  const d = new Date();
  const y = d.getFullYear().toString().padStart(4, '0');
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  // 6 chars alphanumeric uppercase
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${y}${m}${day}-${random}`;
}

module.exports = generateOrderRef;
