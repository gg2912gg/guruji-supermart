// Guruji Supermart - Customer Application (Fortune Residency)
const state = {
  products: [],
  categories: [],
  societies: [],
  coupons: [],
  settings: {},
  deliveryInfo: { fee: 0, label: "Free Delivery", free_threshold: 0, amount_needed_for_free: 0 },
  appliedCoupon: null, // { code, discount, title, terms }
  activeCategory: "All",
  searchQuery: "",
  selectedSociety: localStorage.getItem("gsm_society") || "Fortune Residency",
  cart: JSON.parse(localStorage.getItem("gsm_cart") || "{}")
};

document.addEventListener("DOMContentLoaded", async () => {
  await loadStoreSettings();
  await loadSocieties();
  await loadCategories();
  await loadCoupons();
  await loadProducts();
  setupEventListeners();
  updateCartUI();
  populateSavedUserDetails();
});

// Load Settings
async function loadStoreSettings() {
  try {
    const res = await fetch("/api/settings");
    state.settings = await res.json();
    
    const statusEl = document.getElementById("store-status-badge");
    if (statusEl) {
      if (state.settings.store_open === "1") {
        statusEl.innerHTML = `<span class="live-beacon"></span> Open Now • 5-8m Society Delivery`;
        statusEl.style.color = "#4ade80";
      } else {
        statusEl.innerHTML = `<span style="display:inline-block;width:8px;height:8px;background:#ef4444;border-radius:50%;margin-right:4px;"></span> Store Closed`;
        statusEl.style.color = "#f87171";
      }
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

// Load Societies (Fortune Residency only)
async function loadSocieties() {
  try {
    const res = await fetch("/api/societies");
    state.societies = await res.json();
    
    const selectEl = document.getElementById("checkout-society");
    if (selectEl) {
      selectEl.innerHTML = state.societies.map(s => 
        `<option value="${s.name}" ${s.name === state.selectedSociety ? 'selected' : ''}>${s.name} (${s.estimated_delivery_mins}m Delivery)</option>`
      ).join("");
    }
    
    const headerSocPill = document.getElementById("header-society-pill");
    if (headerSocPill) {
      headerSocPill.innerText = `📍 ${state.selectedSociety}`;
    }
  } catch (err) {
    console.error("Failed to load societies:", err);
  }
}

// Load Coupons
async function loadCoupons() {
  try {
    const res = await fetch("/api/coupons");
    state.coupons = await res.json();
    renderAvailableCoupons();
  } catch (err) {
    console.error("Failed to load coupons:", err);
  }
}

function renderAvailableCoupons() {
  const container = document.getElementById("available-coupons-chips");
  if (!container) return;

  if (state.coupons.length === 0) {
    container.innerHTML = `<span style="font-size: 11px; color: #94a3b8;">No active coupons right now</span>`;
    return;
  }

  container.innerHTML = state.coupons.map(c => `
    <span class="coupon-available-badge" onclick="selectCouponCode('${c.code}')" title="${c.terms || c.description}">
      🏷️ <strong>${c.code}</strong> (${c.title})
    </span>
  `).join("");
}

function selectCouponCode(code) {
  const input = document.getElementById("coupon-code-input");
  if (input) input.value = code;
  applyCouponCode();
}

// Load Categories
async function loadCategories() {
  try {
    const res = await fetch("/api/categories");
    state.categories = await res.json();
    renderCategories();
  } catch (err) {
    console.error("Failed to load categories:", err);
  }
}

function renderCategories() {
  const container = document.getElementById("category-bar");
  if (!container) return;

  let html = `
    <button class="cat-pill ${state.activeCategory === 'All' ? 'active' : ''}" onclick="selectCategory('All')">
      ⚡ All Items
    </button>
  `;

  const iconMap = {
    "Dairy, Bread & Eggs": "🥛",
    "Daily Staples & Atta": "🌾",
    "Biscuits & Munchies": "🍿",
    "Cold Drinks & Instant Mix": "🥤",
    "Cleaning & Household": "🧼",
    "Personal & Baby Care": "🧴",
    "Pooja Needs & Spices": "🪔"
  };

  state.categories.forEach(cat => {
    const icon = iconMap[cat.category] || "🛍️";
    html += `
      <button class="cat-pill ${state.activeCategory === cat.category ? 'active' : ''}" onclick="selectCategory('${cat.category}')">
        ${icon} ${cat.category}
      </button>
    `;
  });

  container.innerHTML = html;
}

function selectCategory(catName) {
  state.activeCategory = catName;
  renderCategories();
  renderProducts();
}

// Load Products
async function loadProducts() {
  try {
    const res = await fetch("/api/products");
    state.products = await res.json();
    renderProducts();
    renderCategories();
  } catch (err) {
    console.error("Failed to load products:", err);
  }
}

function renderProducts() {
  const container = document.getElementById("products-grid");
  if (!container) return;

  let filtered = state.products;

  if (state.activeCategory !== "All") {
    filtered = filtered.filter(p => p.category === state.activeCategory);
  }

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      p.unit.toLowerCase().includes(q)
    );
  }

  const countEl = document.getElementById("item-count-label");
  if (countEl) {
    countEl.innerText = `${filtered.length} products available`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px 16px; background: white; border-radius: 16px;">
        <div style="font-size: 40px; margin-bottom: 12px;">🔍</div>
        <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 6px;">No products found</h3>
        <p style="font-size: 13px; color: #64748b;">Try searching for "Amul", "Milk", "Bread", "Maggi", or reset filters.</p>
        <button class="btn-add-item" style="margin-top: 14px;" onclick="resetSearch()">Show All Items</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const cartItem = state.cart[p.id];
    const qty = cartItem ? cartItem.quantity : 0;
    const isOutOfStock = p.is_available === 0 || p.stock_quantity <= 0;
    const hasDiscount = p.mrp > p.price;
    const discountPercent = hasDiscount ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

    return `
      <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}">
        <div class="product-img-box">
          <img src="${p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80'}" 
               alt="${p.name}" 
               loading="lazy" 
               onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80'">
          ${hasDiscount ? `<span class="badge-discount">${discountPercent}% OFF</span>` : ''}
          <span class="badge-fast">⚡ 5-8m</span>
        </div>

        <div class="product-info">
          <h4 class="product-title" title="${p.name}">${p.name}</h4>
          <span class="product-unit">${p.unit}</span>

          <div class="product-bottom">
            <div class="product-price-box">
              <span class="current-price">₹${p.price}</span>
              ${hasDiscount ? `<span class="mrp-price">₹${p.mrp}</span>` : ''}
            </div>

            ${isOutOfStock ? `
              <span style="font-size: 11px; font-weight: 700; color: #94a3b8; background: #f1f5f9; padding: 4px 8px; border-radius: 6px;">Out of Stock</span>
            ` : qty > 0 ? `
              <div class="qty-counter">
                <button class="btn-qty" onclick="changeQuantity(${p.id}, -1)">−</button>
                <span class="qty-value">${qty}</span>
                <button class="btn-qty" onclick="changeQuantity(${p.id}, 1)">+</button>
              </div>
            ` : `
              <button class="btn-add-item" onclick="changeQuantity(${p.id}, 1)">+ ADD</button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Cart Management
function changeQuantity(productId, delta) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  if (!state.cart[productId]) {
    if (delta > 0) {
      state.cart[productId] = { product: prod, quantity: delta };
    }
  } else {
    state.cart[productId].quantity += delta;
    if (state.cart[productId].quantity <= 0) {
      delete state.cart[productId];
    }
  }

  saveCart();
  renderProducts();
  updateCartUI();
  revalidateCoupon();
}

function saveCart() {
  localStorage.setItem("gsm_cart", JSON.stringify(state.cart));
}

function getCartTotals() {
  let count = 0;
  let subtotal = 0;
  let mrpTotal = 0;

  Object.values(state.cart).forEach(item => {
    count += item.quantity;
    subtotal += item.product.price * item.quantity;
    mrpTotal += (item.product.mrp || item.product.price) * item.quantity;
  });

  return { count, subtotal, savings: Math.max(0, mrpTotal - subtotal) };
}

async function updateCartUI() {
  const { count, subtotal } = getCartTotals();

  // Fetch tiered delivery fee
  if (subtotal > 0) {
    try {
      const res = await fetch(`/api/delivery-fee?cart_total=${subtotal}`);
      state.deliveryInfo = await res.json();
    } catch (e) {
      console.error(e);
    }
  }

  // Header cart button
  const headerCartCount = document.getElementById("header-cart-count");
  if (headerCartCount) {
    headerCartCount.innerText = count > 0 ? `(${count}) ₹${subtotal}` : "Cart";
  }

  // Floating mobile bar
  const mobileBar = document.getElementById("mobile-cart-bar");
  if (mobileBar) {
    if (count > 0) {
      mobileBar.style.display = "flex";
      document.getElementById("bar-item-count").innerText = `${count} ITEM${count > 1 ? 'S' : ''}`;
      document.getElementById("bar-total-amount").innerText = `₹${subtotal}`;
    } else {
      mobileBar.style.display = "none";
    }
  }

  renderDeliveryMeter();
}

function renderDeliveryMeter() {
  const meterEl = document.getElementById("cart-delivery-meter");
  if (!meterEl) return;

  const { subtotal } = getCartTotals();
  if (subtotal === 0) {
    meterEl.style.display = "none";
    return;
  }

  meterEl.style.display = "block";
  const { free_threshold, amount_needed_for_free } = state.deliveryInfo;

  if (amount_needed_for_free <= 0 && free_threshold > 0) {
    meterEl.innerHTML = `
      <div class="meter-text" style="color: #15803d;">
        <span>🎉 You unlocked <strong>FREE Delivery</strong> to your flat!</span>
        <span>₹0</span>
      </div>
      <div class="meter-bar-track">
        <div class="meter-bar-fill" style="width: 100%;"></div>
      </div>
    `;
  } else if (free_threshold > 0) {
    const percent = Math.min(100, Math.round((subtotal / free_threshold) * 100));
    meterEl.innerHTML = `
      <div class="meter-text">
        <span>🚚 Add <strong>₹${amount_needed_for_free}</strong> more for <strong>FREE Delivery</strong>!</span>
        <span>${percent}%</span>
      </div>
      <div class="meter-bar-track">
        <div class="meter-bar-fill" style="width: ${percent}%;"></div>
      </div>
    `;
  } else {
    meterEl.innerHTML = `
      <div class="meter-text" style="color: #15803d;">
        <span>⚡ <strong>FREE Delivery</strong> inside Fortune Residency</span>
      </div>
    `;
  }
}

// Cart Drawer / Modal
function openCartModal() {
  renderCartModalItems();
  document.getElementById("cart-modal").classList.add("open");
}

function closeCartModal() {
  document.getElementById("cart-modal").classList.remove("open");
}

function renderCartModalItems() {
  const listEl = document.getElementById("cart-modal-items");
  const { count, subtotal, savings } = getCartTotals();

  if (count === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 36px 0;">
        <div style="font-size: 38px; margin-bottom: 8px;">🛒</div>
        <p style="font-weight: 800; font-size: 15px; color: #1e293b;">Your cart is empty</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Add your favorite items for 5-8 min flat delivery in Fortune Residency!</p>
      </div>
    `;
    document.getElementById("btn-proceed-checkout").style.display = "none";
    document.getElementById("cart-modal-summary").style.display = "none";
    document.getElementById("cart-coupon-box").style.display = "none";
    return;
  }

  document.getElementById("btn-proceed-checkout").style.display = "flex";
  document.getElementById("cart-modal-summary").style.display = "block";
  document.getElementById("cart-coupon-box").style.display = "block";

  listEl.innerHTML = Object.values(state.cart).map(item => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="${item.product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}" 
             style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px;">
        <div>
          <h5 style="font-size: 13px; font-weight: 750; color: #1e293b;">${item.product.name}</h5>
          <span style="font-size: 11px; color: #64748b;">${item.product.unit} • ₹${item.product.price}</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="qty-counter">
          <button class="btn-qty" onclick="changeQuantity(${item.product.id}, -1)">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="btn-qty" onclick="changeQuantity(${item.product.id}, 1)">+</button>
        </div>
        <span style="font-size: 14px; font-weight: 800; color: #0f172a; min-width: 45px; text-align: right;">₹${item.product.price * item.quantity}</span>
      </div>
    </div>
  `).join("");

  updateBillDisplay();
}

// Coupon Logic
async function applyCouponCode() {
  const codeInput = document.getElementById("coupon-code-input");
  const code = (codeInput?.value || "").trim().toUpperCase();
  if (!code) {
    alert("Please enter a coupon code");
    return;
  }

  const { subtotal } = getCartTotals();
  const msgEl = document.getElementById("coupon-feedback-msg");

  try {
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code, cart_total: subtotal })
    });
    const data = await res.json();

    if (data.valid) {
      state.appliedCoupon = {
        code: code,
        discount: data.discount,
        title: data.coupon.title,
        terms: data.coupon.terms
      };
      if (msgEl) {
        msgEl.innerHTML = `<span style="color: #15803d; font-weight: 700;">${data.message}</span>`;
      }
    } else {
      state.appliedCoupon = null;
      if (msgEl) {
        msgEl.innerHTML = `<span style="color: #b91c1c; font-weight: 600;">${data.message}</span>`;
      }
    }
  } catch (err) {
    alert("Failed to validate coupon");
  }

  updateBillDisplay();
}

function removeAppliedCoupon() {
  state.appliedCoupon = null;
  const codeInput = document.getElementById("coupon-code-input");
  if (codeInput) codeInput.value = "";
  const msgEl = document.getElementById("coupon-feedback-msg");
  if (msgEl) msgEl.innerText = "";
  updateBillDisplay();
}

async function revalidateCoupon() {
  if (state.appliedCoupon) {
    const { subtotal } = getCartTotals();
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: state.appliedCoupon.code, cart_total: subtotal })
    });
    const data = await res.json();
    if (data.valid) {
      state.appliedCoupon.discount = data.discount;
    } else {
      state.appliedCoupon = null;
      const msgEl = document.getElementById("coupon-feedback-msg");
      if (msgEl) msgEl.innerHTML = `<span style="color: #b91c1c; font-weight: 600;">${data.message}</span>`;
    }
  }
  updateBillDisplay();
}

function updateBillDisplay() {
  const { subtotal, savings } = getCartTotals();
  const deliveryFee = state.deliveryInfo.fee || 0;
  const couponDiscount = state.appliedCoupon ? state.appliedCoupon.discount : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - couponDiscount);

  document.getElementById("summary-item-total").innerText = `₹${subtotal}`;
  document.getElementById("summary-delivery-fee").innerText = deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`;
  
  // Coupon row
  const couponRow = document.getElementById("summary-coupon-row");
  if (state.appliedCoupon && couponDiscount > 0) {
    couponRow.style.display = "flex";
    document.getElementById("summary-coupon-name").innerText = `Coupon (${state.appliedCoupon.code})`;
    document.getElementById("summary-coupon-discount").innerText = `−₹${couponDiscount}`;
  } else {
    couponRow.style.display = "none";
  }

  // MRP Savings
  const savingsRow = document.getElementById("summary-savings-row");
  if (savings > 0) {
    savingsRow.style.display = "flex";
    document.getElementById("summary-savings").innerText = `−₹${savings}`;
  } else {
    savingsRow.style.display = "none";
  }

  document.getElementById("summary-grand-total").innerText = `₹${grandTotal}`;
}

// Checkout Modal
function openCheckoutModal() {
  closeCartModal();
  const { subtotal } = getCartTotals();
  const deliveryFee = state.deliveryInfo.fee || 0;
  const couponDiscount = state.appliedCoupon ? state.appliedCoupon.discount : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - couponDiscount);

  document.getElementById("checkout-total-badge").innerText = `₹${grandTotal}`;
  document.getElementById("checkout-modal").classList.add("open");
}

function closeCheckoutModal() {
  document.getElementById("checkout-modal").classList.remove("open");
}

function populateSavedUserDetails() {
  const saved = JSON.parse(localStorage.getItem("gsm_user_details") || "{}");
  if (saved.phone) document.getElementById("checkout-phone").value = saved.phone;
  if (saved.name) document.getElementById("checkout-name").value = saved.name;
  if (saved.flat) document.getElementById("checkout-flat").value = saved.flat;
  if (saved.tower) document.getElementById("checkout-tower").value = saved.tower;
  if (saved.society) {
    const select = document.getElementById("checkout-society");
    if (select) select.value = saved.society;
  }
}

// Submit Order
async function submitOrder(e) {
  e.preventDefault();

  const phone = document.getElementById("checkout-phone").value.trim();
  const name = document.getElementById("checkout-name").value.trim();
  const society = document.getElementById("checkout-society").value.trim();
  const tower = document.getElementById("checkout-tower").value.trim();
  const flat = document.getElementById("checkout-flat").value.trim();
  const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || "COD";
  const notes = document.getElementById("checkout-notes")?.value.trim() || "";

  // Strictly validated 5 fields:
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    alert("Please enter a valid 10-digit mobile number.");
    return;
  }
  if (!name) {
    alert("Please enter your name.");
    return;
  }
  if (!society) {
    alert("Please select your society (Fortune Residency).");
    return;
  }
  if (!tower) {
    alert("Please enter your Tower / Block.");
    return;
  }
  if (!flat) {
    alert("Please enter your Flat No.");
    return;
  }

  const items = Object.values(state.cart).map(item => ({
    product_id: item.product.id,
    product_name: item.product.name,
    unit: item.product.unit,
    price: item.product.price,
    quantity: item.quantity
  }));

  if (items.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  localStorage.setItem("gsm_user_details", JSON.stringify({ phone, name, flat, tower, society }));
  localStorage.setItem("gsm_society", society);

  const btnSubmit = document.getElementById("btn-submit-order");
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<span>⏳ Confirming Order...</span>`;

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: name,
        phone_number: phone,
        society_name: society,
        tower: tower,
        flat_no: flat,
        items: items,
        payment_method: paymentMethod,
        notes: notes,
        coupon_code: state.appliedCoupon ? state.appliedCoupon.code : ""
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to place order");
    }

    state.cart = {};
    state.appliedCoupon = null;
    saveCart();
    updateCartUI();
    closeCheckoutModal();

    window.location.href = `/track?order_id=${data.order_id}`;

  } catch (err) {
    alert("Error placing order: " + err.message);
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `<span>Place Order & Deliver (5-8 Mins) ➔</span>`;
  }
}

// Society Selection Modal
function openSocietyModal() {
  const container = document.getElementById("society-selection-list");
  if (!container) return;

  container.innerHTML = state.societies.map(s => `
    <div style="padding: 14px; border: 2px solid ${s.name === state.selectedSociety ? 'var(--primary)' : '#e2e8f0'}; 
                background: ${s.name === state.selectedSociety ? 'var(--primary-light)' : 'white'};
                border-radius: 14px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
         onclick="chooseSociety('${s.name}')">
      <div>
        <strong style="font-size: 14px; color: #0f172a;">${s.name}</strong>
        <p style="font-size: 11px; color: #64748b;">Home Society • Direct Lift-to-Doorstep Delivery</p>
      </div>
      <span style="font-size: 11px; font-weight: 800; color: #0c831f; background: #dcfce7; padding: 4px 10px; border-radius: 8px;">
        ⚡ ${s.estimated_delivery_mins}m Delivery
      </span>
    </div>
  `).join("");

  document.getElementById("society-modal").classList.add("open");
}

function closeSocietyModal() {
  document.getElementById("society-modal").classList.remove("open");
}

function chooseSociety(socName) {
  state.selectedSociety = socName;
  localStorage.setItem("gsm_society", socName);
  
  const headerPill = document.getElementById("header-society-pill");
  if (headerPill) headerPill.innerText = `📍 ${socName}`;
  
  const checkoutSelect = document.getElementById("checkout-society");
  if (checkoutSelect) checkoutSelect.value = socName;

  closeSocietyModal();
}

function setupEventListeners() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      const clearBtn = document.getElementById("search-clear-btn");
      if (clearBtn) clearBtn.style.display = state.searchQuery ? "flex" : "none";
      renderProducts();
    });
  }

  const orderForm = document.getElementById("society-checkout-form");
  if (orderForm) {
    orderForm.addEventListener("submit", submitOrder);
  }
}

function resetSearch() {
  state.searchQuery = "";
  state.activeCategory = "All";
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.value = "";
  const clearBtn = document.getElementById("search-clear-btn");
  if (clearBtn) clearBtn.style.display = "none";
  renderCategories();
  renderProducts();
}
