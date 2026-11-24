// Guruji Supermart - Merchant Admin Portal Logic
let adminOrders = [];
let adminProducts = [];
let adminSocieties = [];
let adminCoupons = [];
let adminDeliveryTiers = [];
let adminStats = {};
let currentStatusFilter = "ALL";
let currentSocietyFilter = "ALL";
let adminWebSocket = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  await checkAuth();
  await loadAdminData();
  setupWebSocket();
  setupEventListeners();
});

// Admin Pin Authentication Check
async function checkAuth() {
  const token = sessionStorage.getItem("gsm_admin_auth");
  if (!token) {
    document.getElementById("pin-modal").classList.add("open");
  } else {
    document.getElementById("pin-modal").classList.remove("open");
  }
}

async function verifyPin(e) {
  e.preventDefault();
  const pin = document.getElementById("admin-pin-input").value.trim();
  try {
    const res = await fetch("/api/admin/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      sessionStorage.setItem("gsm_admin_auth", "true");
      document.getElementById("pin-modal").classList.remove("open");
      loadAdminData();
    } else {
      alert("Invalid PIN. Default is 1234");
    }
  } catch (err) {
    alert("Authentication failed: " + err.message);
  }
}

function adminLogout() {
  sessionStorage.removeItem("gsm_admin_auth");
  window.location.reload();
}

// Navigation Tabs
function setupTabs() {
  const tabs = document.querySelectorAll(".admin-nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.target;
      document.querySelectorAll(".admin-view-panel").forEach(p => p.style.display = "none");
      document.getElementById(target).style.display = "block";
    });
  });
}

// Load All Backend Data
async function loadAdminData() {
  await Promise.all([
    fetchStats(),
    fetchOrders(),
    fetchProducts(),
    fetchSocieties(),
    fetchCoupons(),
    fetchDeliveryTiers(),
    fetchSettings(),
    fetchBuckets()
  ]);
}

// Fetch Stats
async function fetchStats() {
  try {
    const res = await fetch("/api/admin/stats");
    adminStats = await res.json();
    document.getElementById("stat-today-sales").innerText = `₹${adminStats.today_sales}`;
    document.getElementById("stat-today-orders").innerText = adminStats.today_orders;
    document.getElementById("stat-pending-orders").innerText = adminStats.pending_orders;
    document.getElementById("stat-total-products").innerText = `${adminStats.in_stock_products} / ${adminStats.total_products}`;
    const couponStat = document.getElementById("stat-active-coupons");
    if (couponStat) couponStat.innerText = adminStats.active_coupons || 0;
  } catch (err) {
    console.error("Failed to fetch stats", err);
  }
}

// Fetch Orders
async function fetchOrders() {
  try {
    const res = await fetch("/api/admin/orders");
    adminOrders = await res.json();
    renderOrders();
  } catch (err) {
    console.error("Failed to fetch orders", err);
  }
}

function renderOrders() {
  const container = document.getElementById("admin-orders-list");
  if (!container) return;

  let filtered = adminOrders;

  if (currentStatusFilter !== "ALL") {
    filtered = filtered.filter(o => o.order_status === currentStatusFilter);
  }

  if (currentSocietyFilter !== "ALL") {
    filtered = filtered.filter(o => o.society_name === currentSocietyFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 16px; background: white; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="font-size: 36px; margin-bottom: 8px;">📭</div>
        <h4 style="font-size: 15px; font-weight: 700; color: #1e293b;">No orders found</h4>
        <p style="font-size: 12px; color: #64748b;">No orders matching your active filter criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(o => {
    const statusBadges = {
      "RECEIVED": `<span class="status-pill status-received">📋 Received</span>`,
      "PACKING": `<span class="status-pill status-packing">📦 Packing</span>`,
      "OUT_FOR_DELIVERY": `<span class="status-pill status-delivery">🛵 Out for Delivery</span>`,
      "DELIVERED": `<span class="status-pill status-delivered">🎉 Delivered</span>`,
      "CANCELLED": `<span class="status-pill status-cancelled">❌ Cancelled</span>`
    };

    return `
      <div class="admin-order-card">
        <div class="admin-order-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="font-size: 16px; color: #0f172a;">#${o.id}</strong>
              ${statusBadges[o.order_status] || o.order_status}
              ${o.coupon_code ? `<span style="background: #fef3c7; color: #b45309; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">Coupon: ${o.coupon_code} (-₹${o.discount_amount})</span>` : ''}
            </div>
            <span style="font-size: 11px; color: #64748b;">Placed: ${o.created_at}</span>
          </div>

          <div style="text-align: right;">
            <strong style="font-size: 19px; color: #0c831f;">₹${o.total_amount}</strong>
            <span style="font-size: 11px; display: block; color: #475569;">
              ${o.payment_method === 'COD' ? '💵 Cash on Delivery' : '📲 UPI QR on Delivery'}
            </span>
          </div>
        </div>

        <!-- Customer & Flat Box -->
        <div style="background: #f8fafc; border-radius: 12px; padding: 12px; margin: 12px 0; border-left: 4px solid #0c831f;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
            <div>
              <strong style="font-size: 14px; color: #0f172a;">${o.customer_name}</strong>
              <div style="font-size: 13.5px; font-weight: 800; color: #1e293b; margin-top: 2px;">
                🏢 Flat ${o.flat_no}, ${o.tower}
              </div>
              <div style="font-size: 12px; color: #0c831f; font-weight: 700;">
                📍 ${o.society_name}
              </div>
            </div>

            <div style="display: flex; gap: 6px;">
              <a href="tel:${o.phone_number}" class="btn-micro" style="background: #e2e8f0; color: #0f172a; text-decoration: none;">
                📞 Call (${o.phone_number})
              </a>
              <a href="https://wa.me/91${o.phone_number.replace(/\D/g, '').slice(-10)}?text=Namaste%20${encodeURIComponent(o.customer_name)}%20ji%2C%20Guruji%20Supermart%20here%20regarding%20your%20Order%20${o.id}" 
                 target="_blank" class="btn-micro" style="background: #25D366; color: white; text-decoration: none;">
                💬 WhatsApp
              </a>
            </div>
          </div>
          ${o.notes ? `<p style="font-size: 11px; color: #b45309; margin-top: 6px; font-style: italic;">Note: "${o.notes}"</p>` : ''}
        </div>

        <!-- Ordered Items Summary -->
        <div style="margin-bottom: 12px;">
          <strong style="font-size: 12px; color: #64748b; text-transform: uppercase;">Items (${o.items.length}):</strong>
          <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
            ${o.items.map(it => `
              <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <span>• <strong>${it.product_name}</strong> (${it.unit}) × <strong>${it.quantity}</strong></span>
                <span style="font-weight: 600;">₹${it.total}</span>
              </div>
            `).join("")}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 6px; display: flex; justify-content: space-between;">
            <span>Subtotal: ₹${o.subtotal || o.total_amount} | Delivery: ${o.delivery_fee > 0 ? '₹'+o.delivery_fee : 'FREE'}</span>
            ${o.discount_amount > 0 ? `<span style="color: #0c831f; font-weight: 700;">Discount: −₹${o.discount_amount}</span>` : ''}
          </div>
        </div>

        <!-- Actions Bar -->
        <div class="admin-order-actions">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${o.order_status === 'RECEIVED' ? `
              <button class="btn-action-status btn-status-packing" onclick="changeOrderStatus('${o.id}', 'PACKING')">
                📦 Mark Packing
              </button>
            ` : ''}
            
            ${(o.order_status === 'RECEIVED' || o.order_status === 'PACKING') ? `
              <button class="btn-action-status btn-status-delivery" onclick="changeOrderStatus('${o.id}', 'OUT_FOR_DELIVERY')">
                🛵 Send Out for Delivery
              </button>
            ` : ''}

            ${o.order_status === 'OUT_FOR_DELIVERY' ? `
              <button class="btn-action-status btn-status-delivered" onclick="changeOrderStatus('${o.id}', 'DELIVERED')">
                ✅ Mark Delivered
              </button>
            ` : ''}

            ${(o.order_status !== 'DELIVERED' && o.order_status !== 'CANCELLED') ? `
              <button class="btn-action-status btn-status-cancel" onclick="changeOrderStatus('${o.id}', 'CANCELLED')">
                ✕ Cancel
              </button>
            ` : ''}
          </div>

          <button class="btn-micro" style="background: #f1f5f9; border: 1px solid #cbd5e1; cursor: pointer;" onclick="printOrderSlip('${o.id}')">
            🖨️ Print Delivery Slip
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// Change Order Status
async function changeOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      await fetchOrders();
      await fetchStats();
    }
  } catch (err) {
    alert("Error updating order: " + err.message);
  }
}

// Print Order Slip / KOT format
function printOrderSlip(orderId) {
  const o = adminOrders.find(item => item.id === orderId);
  if (!o) return;

  const printWindow = window.open("", "_blank", "width=380,height=600");
  printWindow.document.write(`
    <html>
    <head>
      <title>Guruji Supermart - Order ${o.id}</title>
      <style>
        body { font-family: monospace; padding: 12px; margin: 0; font-size: 13px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .dashed { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        h2 { margin: 0 0 4px 0; font-size: 17px; }
      </style>
    </head>
    <body>
      <div class="center">
        <h2>GURUJI SUPERMART</h2>
        <div>Fortune Residency, Rajnagar Ext.</div>
        <div>Ph: +91 98188 54321</div>
        <div class="dashed"></div>
        <div class="bold" style="font-size: 14px;">DELIVERY SLIP</div>
        <div>Order: #${o.id}</div>
        <div>Date: ${o.created_at}</div>
      </div>

      <div class="dashed"></div>
      <div><strong>CUSTOMER:</strong> ${o.customer_name} (${o.phone_number})</div>
      <div style="font-size: 14px; margin: 4px 0;"><strong>FLAT:</strong> ${o.flat_no}, ${o.tower}</div>
      <div><strong>SOCIETY:</strong> ${o.society_name}</div>
      ${o.notes ? `<div><strong>NOTE:</strong> ${o.notes}</div>` : ''}

      <div class="dashed"></div>
      <div class="bold">ITEMS:</div>
      ${o.items.map(it => `
        <div class="row">
          <span>${it.product_name} (${it.unit}) x${it.quantity}</span>
          <span>₹${it.total}</span>
        </div>
      `).join("")}

      <div class="dashed"></div>
      <div class="row">
        <span>Subtotal:</span>
        <span>₹${o.subtotal || o.total_amount}</span>
      </div>
      <div class="row">
        <span>Delivery Fee:</span>
        <span>${o.delivery_fee > 0 ? '₹'+o.delivery_fee : 'FREE'}</span>
      </div>
      ${o.discount_amount > 0 ? `
        <div class="row" style="color: #0c831f;">
          <span>Coupon (${o.coupon_code}):</span>
          <span>-₹${o.discount_amount}</span>
        </div>
      ` : ''}

      <div class="dashed"></div>
      <div class="row bold" style="font-size: 16px;">
        <span>TOTAL TO COLLECT:</span>
        <span>₹${o.total_amount}</span>
      </div>
      <div class="center" style="margin-top: 6px;">
        Payment: <strong>${o.payment_method === 'COD' ? 'CASH ON DELIVERY' : 'UPI QR ON DELIVERY'}</strong>
      </div>

      <div class="dashed"></div>
      <div class="center" style="font-size: 11px;">
        *** Thank you for shopping local! ***<br>
        Direct 5-8 Min Society Delivery
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// Product Inventory Management
async function fetchProducts() {
  try {
    const res = await fetch("/api/products");
    adminProducts = await res.json();
    renderInventoryTable();
  } catch (err) {
    console.error("Failed to fetch products", err);
  }
}

function renderInventoryTable() {
  const tbody = document.getElementById("inventory-table-body");
  if (!tbody) return;

  const searchVal = document.getElementById("inventory-search")?.value.toLowerCase().trim() || "";
  const catVal = document.getElementById("inventory-cat-filter")?.value || "ALL";

  let filtered = adminProducts;

  if (catVal !== "ALL") {
    filtered = filtered.filter(p => p.category === catVal);
  }

  if (searchVal) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(searchVal) || p.unit.toLowerCase().includes(searchVal));
  }

  document.getElementById("inventory-count-badge").innerText = `${filtered.length} products listed`;

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80'}" 
               style="width: 36px; height: 36px; object-fit: cover; border-radius: 6px;">
          <div>
            <strong style="color: #0f172a; font-size: 13px;">${p.name}</strong>
            <span style="display: block; font-size: 11px; color: #64748b;">${p.category}</span>
          </div>
        </div>
      </td>
      <td><span style="font-size: 12px; color: #475569;">${p.unit}</span></td>
      <td><strong style="color: #0c831f; font-size: 13px;">₹${p.price}</strong></td>
      <td><span style="color: #94a3b8; font-size: 12px; text-decoration: line-through;">₹${p.mrp}</span></td>
      <td>
        <button class="btn-micro" 
                style="background: ${p.is_available ? '#dcfce7' : '#fee2e2'}; color: ${p.is_available ? '#166534' : '#991b1b'}; font-weight: 700; cursor: pointer;"
                onclick="toggleStock(${p.id})">
          ${p.is_available ? '🟢 In Stock' : '🔴 Out of Stock'}
        </button>
      </td>
      <td>
        <button class="btn-micro" style="background: #fee2e2; color: #dc2626; cursor: pointer;" onclick="deleteProduct(${p.id})">
          🗑️ Delete
        </button>
      </td>
    </tr>
  `).join("");
}

async function toggleStock(productId) {
  try {
    const res = await fetch(`/api/admin/products/${productId}/toggle-stock`, { method: "POST" });
    if (res.ok) {
      await fetchProducts();
      await fetchStats();
    }
  } catch (err) {
    alert("Failed to toggle stock status");
  }
}

async function deleteProduct(productId) {
  if (!confirm("Are you sure you want to remove this item?")) return;
  try {
    const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    if (res.ok) {
      await fetchProducts();
      await fetchStats();
    }
  } catch (err) {
    alert("Failed to delete product");
  }
}

async function submitNewProduct(e) {
  e.preventDefault();
  const name = document.getElementById("new-prod-name").value.trim();
  const category = document.getElementById("new-prod-cat").value;
  const unit = document.getElementById("new-prod-unit").value.trim();
  const price = parseFloat(document.getElementById("new-prod-price").value);
  const mrp = parseFloat(document.getElementById("new-prod-mrp").value || price);
  const imageUrl = document.getElementById("new-prod-image").value.trim();

  try {
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, category, unit, price, mrp, image_url: imageUrl, is_available: 1, stock_quantity: 50
      })
    });

    if (res.ok) {
      document.getElementById("new-product-modal").classList.remove("open");
      document.getElementById("new-product-form").reset();
      await fetchProducts();
      await fetchStats();
      alert("Product added successfully!");
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Coupons Management in Admin
async function fetchCoupons() {
  try {
    const res = await fetch("/api/admin/coupons");
    adminCoupons = await res.json();
    renderCouponsTable();
  } catch (err) {
    console.error("Failed to fetch coupons", err);
  }
}

function renderCouponsTable() {
  const container = document.getElementById("coupons-table-body");
  if (!container) return;

  if (adminCoupons.length === 0) {
    container.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 24px;">No coupons created yet. Click "+ Create New Coupon" below.</td></tr>`;
    return;
  }

  container.innerHTML = adminCoupons.map(c => `
    <tr>
      <td>
        <strong style="color: #b45309; font-size: 14px; background: #fef3c7; padding: 4px 8px; border-radius: 6px; letter-spacing: 1px;">${c.code}</strong>
        <span style="display: block; font-size: 11px; color: #64748b; margin-top: 4px;">${c.title}</span>
      </td>
      <td>
        <strong style="color: #0c831f;">${c.discount_type === 'FLAT' ? '₹' + c.discount_val + ' Flat' : c.discount_val + '%'}</strong>
        ${c.max_discount > 0 ? `<span style="font-size: 10px; color: #64748b; display: block;">Cap: ₹${c.max_discount}</span>` : ''}
      </td>
      <td><strong>₹${c.min_order_amount}</strong></td>
      <td style="max-width: 200px; font-size: 11.5px; color: #475569;">
        ${c.terms || c.description || 'No conditions'}
      </td>
      <td>
        <button class="btn-micro" 
                style="background: ${c.is_active ? '#dcfce7' : '#fee2e2'}; color: ${c.is_active ? '#166534' : '#991b1b'}; font-weight: 700; cursor: pointer;"
                onclick="toggleCoupon(${c.id})">
          ${c.is_active ? '🟢 Active' : '🔴 Inactive'}
        </button>
      </td>
      <td>
        <button class="btn-micro" style="background: #fee2e2; color: #dc2626; cursor: pointer;" onclick="deleteCoupon(${c.id})">
          🗑️ Delete
        </button>
      </td>
    </tr>
  `).join("");
}

async function toggleCoupon(id) {
  try {
    await fetch(`/api/admin/coupons/${id}/toggle`, { method: "POST" });
    await fetchCoupons();
    await fetchStats();
  } catch (e) {
    alert("Failed to toggle coupon");
  }
}

async function deleteCoupon(id) {
  if (!confirm("Are you sure you want to delete this coupon?")) return;
  try {
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    await fetchCoupons();
    await fetchStats();
  } catch (e) {
    alert("Failed to delete coupon");
  }
}

async function submitNewCoupon(e) {
  e.preventDefault();
  const code = document.getElementById("new-coupon-code").value.trim().toUpperCase();
  const title = document.getElementById("new-coupon-title").value.trim();
  const discountType = document.getElementById("new-coupon-type").value;
  const discountVal = parseFloat(document.getElementById("new-coupon-val").value);
  const minOrder = parseFloat(document.getElementById("new-coupon-min").value || 0);
  const maxDiscount = parseFloat(document.getElementById("new-coupon-max").value || 0);
  const terms = document.getElementById("new-coupon-terms").value.trim();

  if (!code || isNaN(discountVal)) {
    alert("Please fill code and discount amount");
    return;
  }

  try {
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code, title, discount_type: discountType, discount_val: discountVal,
        min_order_amount: minOrder, max_discount: maxDiscount, terms, is_active: 1
      })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById("new-coupon-modal").classList.remove("open");
      document.getElementById("new-coupon-form").reset();
      await fetchCoupons();
      await fetchStats();
      alert("Coupon created successfully!");
    } else {
      alert("Error: " + data.detail);
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Delivery Tiers Management
async function fetchDeliveryTiers() {
  try {
    const res = await fetch("/api/admin/delivery-tiers");
    adminDeliveryTiers = await res.json();
    renderDeliveryTiers();
  } catch (err) {
    console.error("Failed to fetch delivery tiers", err);
  }
}

function renderDeliveryTiers() {
  const container = document.getElementById("delivery-tiers-container");
  if (!container) return;

  container.innerHTML = adminDeliveryTiers.map((t, idx) => `
    <div style="background: white; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div>
        <strong style="color: #0f172a; font-size: 14px;">Order Range: ₹${t.min_cart} – ${t.max_cart >= 99999 ? 'Above' : '₹' + t.max_cart}</strong>
        <p style="font-size: 12px; color: #64748b; margin-top: 2px;">${t.label || (t.fee === 0 ? 'FREE Delivery' : 'Standard Delivery')}</p>
      </div>
      <div>
        <span style="font-size: 16px; font-weight: 800; color: ${t.fee === 0 ? '#0c831f' : '#b45309'}; background: ${t.fee === 0 ? '#dcfce7' : '#fef3c7'}; padding: 6px 12px; border-radius: 8px;">
          ${t.fee === 0 ? 'FREE (₹0)' : '₹' + t.fee + ' Fee'}
        </span>
      </div>
    </div>
  `).join("");
}

async function saveCustomTiers(e) {
  e.preventDefault();
  const tier1Fee = parseFloat(document.getElementById("tier1-fee").value || 15);
  const tier2Fee = parseFloat(document.getElementById("tier2-fee").value || 10);
  const freeThreshold = parseFloat(document.getElementById("tier-free-threshold").value || 200);

  const newTiers = [
    { min_cart: 0, max_cart: 99, fee: tier1Fee, label: `₹${tier1Fee} Delivery Fee (Cart < ₹100)` },
    { min_cart: 100, max_cart: freeThreshold - 1, fee: tier2Fee, label: `₹${tier2Fee} Delivery Fee` },
    { min_cart: freeThreshold, max_cart: 999999, fee: 0.0, label: `FREE Delivery (Orders above ₹${freeThreshold})` }
  ];

  try {
    const res = await fetch("/api/admin/delivery-tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTiers)
    });
    if (res.ok) {
      await fetchDeliveryTiers();
      alert("Delivery fee tier pricing updated successfully!");
    }
  } catch (err) {
    alert("Failed to update delivery tiers: " + err.message);
  }
}

// Societies
async function fetchSocieties() {
  try {
    const res = await fetch("/api/admin/societies");
    adminSocieties = await res.json();
    
    const select = document.getElementById("order-society-filter");
    if (select) {
      select.innerHTML = `<option value="ALL">All Societies</option>` + 
        adminSocieties.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
    }

    const socList = document.getElementById("admin-societies-list");
    if (socList) {
      socList.innerHTML = adminSocieties.map(s => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: white; border: 1.5px solid #e2e8f0; border-radius: 12px; margin-bottom: 8px;">
          <div>
            <strong style="font-size: 14px; color: #0f172a;">📍 ${s.name}</strong>
            <span style="display: block; font-size: 11px; color: #0c831f; font-weight: 700; margin-top: 2px;">⚡ ${s.estimated_delivery_mins}m Delivery ETA</span>
          </div>
          ${adminSocieties.length > 1 ? `
            <button class="btn-micro" style="background: #fee2e2; color: #dc2626; cursor: pointer;" onclick="deleteSociety(${s.id})">
              🗑️ Remove
            </button>
          ` : `<span style="font-size: 11px; color: #64748b; font-weight: 600;">(Home Society)</span>`}
        </div>
      `).join("");
    }
  } catch (err) {
    console.error("Failed to fetch societies", err);
  }
}

async function addSocietySubmit(e) {
  e.preventDefault();
  const name = document.getElementById("new-soc-name").value.trim();
  const mins = parseInt(document.getElementById("new-soc-mins").value) || 10;
  if (!name) return;

  try {
    const res = await fetch(`/api/admin/societies?name=${encodeURIComponent(name)}&delivery_mins=${mins}`, { method: "POST" });
    if (res.ok) {
      document.getElementById("new-soc-name").value = "";
      await fetchSocieties();
      alert(`Society '${name}' added!`);
    } else {
      alert("Society already exists or invalid");
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function deleteSociety(id) {
  if (!confirm("Are you sure you want to remove this society?")) return;
  try {
    await fetch(`/api/admin/societies/${id}`, { method: "DELETE" });
    await fetchSocieties();
  } catch (e) {
    alert("Failed to delete society");
  }
}

// Store Settings
async function fetchSettings() {
  try {
    const res = await fetch("/api/settings");
    const settings = await res.json();

    const openToggle = document.getElementById("toggle-store-open");
    if (openToggle) {
      openToggle.checked = settings.store_open === "1";
      document.getElementById("store-open-label").innerText = settings.store_open === "1" ? "Store OPEN (Taking Orders)" : "Store CLOSED (Not Taking Orders)";
    }

    if (document.getElementById("setting-store-name")) {
      document.getElementById("setting-store-name").value = settings.store_name || "Guruji Supermart";
      document.getElementById("setting-store-phone").value = settings.store_phone || "";
      document.getElementById("setting-store-whatsapp").value = settings.whatsapp_number || "";
      document.getElementById("setting-min-order").value = settings.min_order_value || "0";
    }
  } catch (err) {
    console.error("Failed to fetch settings", err);
  }
}

async function toggleStoreOpenState(e) {
  const isOpen = e.target.checked ? "1" : "0";
  try {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "store_open", value: isOpen })
    });
    document.getElementById("store-open-label").innerText = isOpen === "1" ? "Store OPEN (Taking Orders)" : "Store CLOSED (Not Taking Orders)";
  } catch (err) {
    alert("Failed to update store open state: " + err.message);
  }
}

async function saveGeneralSettings(e) {
  e.preventDefault();
  const storeName = document.getElementById("setting-store-name").value.trim();
  const storePhone = document.getElementById("setting-store-phone").value.trim();
  const whatsapp = document.getElementById("setting-store-whatsapp").value.trim();
  const minOrder = document.getElementById("setting-min-order").value.trim();

  try {
    await Promise.all([
      fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "store_name", value: storeName }) }),
      fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "store_phone", value: storePhone }) }),
      fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "whatsapp_number", value: whatsapp }) }),
      fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "min_order_value", value: minOrder }) })
    ]);
    alert("Settings saved successfully!");
  } catch (err) {
    alert("Failed to save settings: " + err.message);
  }
}

// Buckets
async function fetchBuckets() {
  try {
    const res = await fetch("/api/admin/buckets");
    const buckets = await res.json();
    const container = document.getElementById("bucket-presets-container");
    if (!container) return;

    container.innerHTML = Object.entries(buckets).map(([key, b]) => `
      <div style="background: white; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${b.title}</h4>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">${b.description}</p>
          <div style="font-size: 11px; color: #475569; background: #f8fafc; padding: 8px; border-radius: 8px; margin-bottom: 14px;">
            ${b.items.map(i => `• ${i.name} (₹${i.price})`).slice(0, 4).join("<br>")}
            ${b.items.length > 4 ? `<br><em>+ ${b.items.length - 4} more items...</em>` : ''}
          </div>
        </div>
        <button class="btn-primary-action" style="padding: 10px; font-size: 13px;" onclick="loadPresetBucket('${key}')">
          ⚡ Add Bucket to Inventory (${b.items.length} Items)
        </button>
      </div>
    `).join("");
  } catch (err) {
    console.error("Failed to load buckets", err);
  }
}

async function loadPresetBucket(bucketKey) {
  if (!confirm(`Add this bucket of items to inventory?`)) return;
  try {
    const res = await fetch("/api/admin/buckets/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket_key: bucketKey })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      await fetchProducts();
      await fetchStats();
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function submitBulkText(e) {
  e.preventDefault();
  const rawText = document.getElementById("bulk-raw-text").value.trim();
  if (!rawText) return;

  try {
    const res = await fetch("/api/admin/buckets/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: rawText })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      document.getElementById("bulk-raw-text").value = "";
      await fetchProducts();
      await fetchStats();
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// WebSocket Live Order Alerts & Sound Chime
function setupWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/orders`;

  try {
    adminWebSocket = new WebSocket(wsUrl);

    adminWebSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === "new_order") {
          playOrderChime(msg.order);
          fetchOrders();
          fetchStats();
        } else if (msg.event === "order_status_updated") {
          fetchOrders();
          fetchStats();
        }
      } catch (e) {
        console.error("WS error", e);
      }
    };

    adminWebSocket.onclose = () => {
      setTimeout(setupWebSocket, 3000);
    };
  } catch (err) {
    console.warn("WebSocket not supported", err);
  }
}

function playOrderChime(order) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    }
  } catch (e) {}

  try {
    if ('speechSynthesis' in window && order) {
      const utterance = new SpeechSynthesisUtterance(`New order! Flat ${order.flat_no}, ${order.tower}, ${order.society_name}.`);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {}
}

// Event Listeners setup
function setupEventListeners() {
  document.getElementById("pin-form")?.addEventListener("submit", verifyPin);
  document.getElementById("new-product-form")?.addEventListener("submit", submitNewProduct);
  document.getElementById("new-coupon-form")?.addEventListener("submit", submitNewCoupon);
  document.getElementById("tier-pricing-form")?.addEventListener("submit", saveCustomTiers);
  document.getElementById("bulk-text-form")?.addEventListener("submit", submitBulkText);
  document.getElementById("add-society-form")?.addEventListener("submit", addSocietySubmit);
  document.getElementById("general-settings-form")?.addEventListener("submit", saveGeneralSettings);
  document.getElementById("toggle-store-open")?.addEventListener("change", toggleStoreOpenState);

  document.querySelectorAll(".order-filter-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".order-filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentStatusFilter = pill.dataset.status;
      renderOrders();
    });
  });

  document.getElementById("order-society-filter")?.addEventListener("change", (e) => {
    currentSocietyFilter = e.target.value;
    renderOrders();
  });

  document.getElementById("inventory-search")?.addEventListener("input", renderInventoryTable);
  document.getElementById("inventory-cat-filter")?.addEventListener("change", renderInventoryTable);
}
