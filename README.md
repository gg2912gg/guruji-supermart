# 🛒 Guruji Supermart - Fortune Residency, Rajnagar Extension

A hyper-local, society-first quick commerce platform designed specifically for **Guruji Supermart** to deliver daily groceries, dairy, and household essentials directly to flats inside **Fortune Residency, Rajnagar Extension within 5–8 minutes**.

---

## 🌐 Live Public Website & URLs

Your store is currently hosted live on the web:

- **Live Public Storefront**: [https://land-combinations-vocabulary-needs.trycloudflare.com](https://land-combinations-vocabulary-needs.trycloudflare.com)
- **Live Public Merchant Admin**: [https://land-combinations-vocabulary-needs.trycloudflare.com/admin](https://land-combinations-vocabulary-needs.trycloudflare.com/admin) *(PIN: `1234`)*
- **Live Order Tracking**: [https://land-combinations-vocabulary-needs.trycloudflare.com/track](https://land-combinations-vocabulary-needs.trycloudflare.com/track)
- **Local Address**: `http://localhost:8000`

---

## ⚡ Key Updates & Features

### 1. Delivery Strictly inside Fortune Residency
- By default, orders are restricted to **Fortune Residency only** with ultra-fast **5–8 minute** flat delivery.
- In the Admin Panel under **"Societies List"**, you can add any other societies with custom delivery ETAs according to your conditions anytime.

### 2. Tiered Delivery Pricing
Motivate residents to order more with quick-commerce milestone pricing:
- **Cart under ₹100**: ₹15 Delivery Fee (small cart handling)
- **Cart ₹100 – ₹199**: ₹10 Delivery Fee
- **Cart ₹200 and above**: **FREE DELIVERY (₹0)**!
- **Dynamic Cart Meter**: Displays an animated progress bar in the customer's cart:
  `🚚 Add ₹35 more for FREE Delivery! [=========>  ]`
- Full tier editor in Admin under **"Delivery Fee & Tiers"**.

### 3. Coupon Codes with Terms & Conditions
- Manage promo codes in Admin under **"Coupons & Discounts"**:
  - Coupon Code (e.g. `GURUJI20`, `WELCOME50`, `SUPER10`)
  - Discount Type: Flat ₹ off or Percentage % off
  - Minimum Order Value condition (e.g. valid only on carts above ₹99)
  - Terms & Conditions description displayed to residents
  - 1-Click Active / Inactive switch
- Customers can apply codes or tap pre-loaded coupon chips during checkout with instant validation.

### 4. Mandatory 5-Field Ordering Form
Residents fill **only** these 5 fields (no complicated addresses or pincodes):
1. **Full Name**
2. **Mobile / WhatsApp Number** (10 digits)
3. **Society Name** (Fortune Residency)
4. **Tower / Block**
5. **Flat No.**

*(Saved in their browser for 1-click reordering!)*

### 5. Merchant Dispatch with Live Audio & Printing
- Plays audio chime and speaks aloud incoming orders: *"New order! Flat 402, Tower B, Fortune Residency"*.
- Status buttons: `Mark Packing`, `Send Out for Delivery`, `Mark Delivered`.
- One-click thermal delivery slip printing formatted for polybags.

---

## 🏃 Running the Store
Double-click `start_store.bat` in this folder to start both the store server and the live Cloudflare tunnel.
