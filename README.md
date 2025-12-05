
# Ecommerce API Assignment

Author: **Praful Sawant**  
GitHub: https://github.com/iampraful/ecommerce-backend-google-auth  
Email: prafulsawant95@gmail.com

---

# 🛒 Overview

This project is a backend-only **Ecommerce API** built with **Node.js**, featuring:

- Google OAuth Login (custom, without Passport)
- Session-based authentication
- Product catalog with ordered image gallery
- AWS S3 image uploads
- Order placement flow with unique order references
- Email notifications using SendGrid SMTP
- MongoDB + Mongoose data modeling
- REST API–driven architecture

This fulfills all requirements of the assignment.

---

# 📁 Project Structure

```
/src
  /config
  /models
  /controllers
  /routes
  /middlewares
  /services
  /utils
/postman
  ecommerce-api.postman_collection.json
/seed-data
  products.json
app.js
server.js
.env.example
README.md
```

---

# 🧰 Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB + Mongoose**
- **Google OAuth 2.0 (manual implementation)**
- **Express-session**
- **AWS S3 (file uploads)**
- **SendGrid SMTP**
- **Nodemailer**
- **REST APIs**

---

# ⚙️ Environment Variables

Create a `.env` file:

```
PORT=4000
SESSION_SECRET=your-secret-key

# MongoDB
MONGODB_URI=mongodb+srv://...

# Google OAuth
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

# AWS S3
AWS_ACCESS_KEY_ID=xxxx
AWS_SECRET_ACCESS_KEY=xxxx
AWS_REGION=ap-south-1
AWS_S3_BUCKET=ps-ecommerce-products

# SendGrid SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxx
EMAIL_FROM="Ecommerce Backend <prafulsawant95@gmail.com>"
```

---

# ▶️ Installation

```
git clone https://github.com/iampraful/ecommerce-backend-google-auth
cd ecommerce-backend-google-auth
npm install
npm run dev
```

Server runs at:  
`http://localhost:4000`

---

# 🌱 Database Seeding (Products Only)

To test the project, sample products must be inserted.

mongoimport --db ecommerce --collection products --file seed-data/products.json

This inserts all demo products with S3 image URLs.

---

# 📬 Postman Collection

A ready-to-import Postman collection is included:

```
/postman/ecommerce-api.postman_collection.json
```

Import into Postman:

**Postman → Import → File → select the JSON file**

This includes:

- Google OAuth login instructions
- Get products
- Place order
- Get order history

---

# 🔐 Authentication (Google OAuth)

### Start Google Login
```
GET /api/auth/google
```

### After logging in:
- User is redirected to `/profile`
- A **session cookie** is created:
  ```
  connect.sid=xxxxxx
  ```

This cookie is required for all protected routes (order placement + order history).

---

# 🍪 Using Authentication in Postman or Curl

### Step 1 → Login with Google & capture session cookie

If using browser:  
- Visit: `http://localhost:4000/api/auth/google`  
- After login → copy cookie from browser devtools.

If using curl for dev login:
```
curl -i -c cookies.txt -X POST http://localhost:4000/dev/login
```

### Step 2 → Use cookie in authenticated requests
```
curl -b cookies.txt http://localhost:4000/api/me
```

If cookie is missing → API returns:

```
401 Unauthorized
{
  "success": false,
  "message": "Unauthorized. Please sign in."
}
```

---

# 🛍 Product APIs

### ➤ Get All Products
```
GET /api/products
```

### ➤ Create Product  
*(for assignment/admin use)*

```json
POST /api/products/createProduct
{
  "title": "Xiaomi 15",
  "description": "Flagship phone",
  "category": "mobiles",
  "price": 89999,
  "images": [
    {
      "url": "https://ps-ecommerce-products.s3.ap-south-1.amazonaws.com/products/xiaomi15.jpg",
      "key": "xiaomi-15.jpg",
      "order": 0
    }
  ]
}
```

---

# 🧾 Order APIs (AUTH REQUIRED)

All order routes require authentication.

---

## 🔐 Place Order (Requires Google Login)

```
curl -b cookies.txt -X POST http://localhost:4000/api/orders   -H "Content-Type: application/json"   -d '{
    "items": [
      { "productId": "693179ba52b8545682c6653d", "quantity": 1 }
    ]
  }'
```

### Response:
```json
{
  "success": true,
  "message": "Order placed successfully",
  "order": {
    "_id": "...",
    "orderRef": "ORD-2025-XYZ123",
    "total": 79999,
    "items": [...],
    "createdAt": "..."
  }
}
```

---

## 📦 Get My Orders (Requires Google Login)

```
curl -b cookies.txt http://localhost:4000/api/orders
```

---

# 📧 Email Notifications

When an authenticated user places an order:

- An email is sent to their verified email address
- Includes:
  - Order reference
  - Item list
  - Total amount
  - Timestamp
- Uses **SendGrid SMTP + Nodemailer**
- Includes both HTML + plain-text fallback

---

# 🧹 Error Handling

Central error middleware handles:

- Invalid IDs
- Unauthorized access
- Missing fields
- Internal server errors

With structured JSON responses.

---

# 📝 License

This project is created for assignment submission.  
No open-source license is applied.

---

# 👤 Author

**Praful Sawant**  
📧 Email: **prafulsawant95@gmail.com**  
🔗 GitHub: https://github.com/iampraful

