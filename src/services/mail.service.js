const nodemailer = require("nodemailer");

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM
} = process.env;

// Create the transporter (SendGrid SMTP)
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: SMTP_SECURE === "true", // false for 587, true for 465
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

// Helper: build order summary table HTML
function buildOrderHtml(order) {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${item.title}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">₹${item.price}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">₹${item.subtotal}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;">
      <h2>Order Confirmation</h2>
      <p>Thank you for your purchase!</p>
      <p><strong>Order Ref:</strong> ${order.orderRef}</p>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>

      <table style="border-collapse:collapse;width:100%;margin-top:15px;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Item</th>
            <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Qty</th>
            <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Price</th>
            <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">Total</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">₹${order.total}</td>
          </tr>
        </tfoot>
      </table>

      <p style="margin-top:20px;">If you have any questions, just reply to this email.</p>
      <p style="font-size:12px;color:#888;">This is an automated receipt from your ecommerce app.</p>
    </div>
  `;
}

// Main function: send confirmation email
async function sendOrderConfirmation(to, order) {
  const html = buildOrderHtml(order);

  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject: `Your Order Confirmation - ${order.orderRef}`,
    html,
    text: `Order Confirmation for ${order.orderRef}. Total: ₹${order.total}.`
  });

  console.log("Email sent:", info.messageId);
  return info;
}

module.exports = { sendOrderConfirmation };
