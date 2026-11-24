// Guruji Kripa Supermart - Live Order Tracking
let currentOrderId = null;
let orderPollingTimer = null;
let trackWebSocket = null;

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("order_id");

  if (orderId) {
    currentOrderId = orderId;
    loadOrderDetails(orderId);
    setupWebSocket();
  } else {
    showSearchBox();
  }

  // Mobile number tracker form
  const phoneForm = document.getElementById("phone-track-form");
  if (phoneForm) {
    phoneForm.addEventListener("submit", trackByPhone);
  }
});

function showSearchBox() {
  document.getElementById("track-search-section").style.display = "block";
  document.getElementById("track-detail-section").style.display = "none";
}

async function loadOrderDetails(orderId) {
  try {
    const res = await fetch(`/api/orders/${orderId}`);
    if (!res.ok) {
      alert("Order not found. Please check your order ID.");
      showSearchBox();
      return;
    }
    const order = await res.json();
    renderTrackingDetails(order);
  } catch (err) {
    console.error("Error loading order:", err);
  }
}

function renderTrackingDetails(order) {
  document.getElementById("track-search-section").style.display = "none";
  document.getElementById("track-detail-section").style.display = "block";

  document.getElementById("display-order-id").innerText = order.id;
  document.getElementById("display-order-time").innerText = `Ordered at ${order.created_at}`;

  // Customer & Flat Address
  document.getElementById("display-customer-name").innerText = order.customer_name;
  document.getElementById("display-customer-phone").innerText = order.phone_number;
  document.getElementById("display-delivery-address").innerHTML = `
    <strong>Flat ${order.flat_no}, ${order.tower}</strong><br>
    ${order.society_name}, Rajnagar Extension, Ghaziabad
  `;

  // Status Stepper
  updateStatusStepper(order.order_status);

  // Items List
  const itemsContainer = document.getElementById("order-items-list");
  itemsContainer.innerHTML = order.items.map(item => `
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px;">
      <div>
        <strong>${item.product_name}</strong>
        <span style="color: #64748b; font-size: 11px; display: block;">${item.unit} × ${item.quantity}</span>
      </div>
      <strong style="color: #0f172a;">₹${item.total}</strong>
    </div>
  `).join("");

  document.getElementById("display-total-amount").innerText = `₹${order.total_amount}`;
  document.getElementById("display-payment-info").innerText = `${order.payment_method === 'COD' ? 'Cash on Delivery (COD)' : 'UPI on Delivery'} • ${order.payment_status}`;

  // WhatsApp Button
  const waBtn = document.getElementById("btn-wa-inquire");
  if (waBtn) {
    const waText = encodeURIComponent(`Hi Guruji Kripa Supermart, I placed Order #${order.id} for Flat ${order.flat_no}, ${order.tower}, ${order.society_name}. Total: ₹${order.total_amount}.`);
    waBtn.href = `https://wa.me/919818854321?text=${waText}`;
  }
}

function updateStatusStepper(status) {
  const steps = ["RECEIVED", "PACKING", "OUT_FOR_DELIVERY", "DELIVERED"];
  const statusIndex = steps.indexOf(status);

  const statusTextMap = {
    "RECEIVED": "Order Received 📋",
    "PACKING": "Packing at Guruji Kripa Supermart 📦",
    "OUT_FOR_DELIVERY": "Out for Delivery (On the way to flat!) 🛵",
    "DELIVERED": "Delivered to your doorstep 🎉",
    "CANCELLED": "Order Cancelled ❌"
  };

  const statusDescMap = {
    "RECEIVED": "Shopkeeper has confirmed your order and is picking fresh items from shelves.",
    "PACKING": "Your groceries are packed in eco-friendly bags and ready for dispatch.",
    "OUT_FOR_DELIVERY": "Our delivery boy is inside your society, heading up the lift to your flat!",
    "DELIVERED": "Order successfully delivered! Thank you for supporting your local supermart.",
    "CANCELLED": "This order was cancelled. Please contact the store on WhatsApp."
  };

  document.getElementById("current-status-title").innerText = statusTextMap[status] || status;
  document.getElementById("current-status-desc").innerText = statusDescMap[status] || "";

  steps.forEach((step, idx) => {
    const stepEl = document.getElementById(`step-${step.toLowerCase()}`);
    if (!stepEl) return;

    if (status === "CANCELLED") {
      stepEl.classList.remove("active", "completed");
    } else if (idx < statusIndex) {
      stepEl.className = "track-step completed";
    } else if (idx === statusIndex) {
      stepEl.className = "track-step active";
    } else {
      stepEl.className = "track-step pending";
    }
  });
}

// WebSocket Live Updates
function setupWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/orders`;

  try {
    trackWebSocket = new WebSocket(wsUrl);

    trackWebSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === "order_status_updated" && msg.order_id === currentOrderId) {
          updateStatusStepper(msg.new_status);
        }
      } catch (e) {
        console.error("WS Parse error", e);
      }
    };

    trackWebSocket.onclose = () => {
      // Reconnect after 3s
      setTimeout(setupWebSocket, 3000);
    };
  } catch (err) {
    console.warn("WebSocket not supported, falling back to polling", err);
    // Polling fallback
    setInterval(() => {
      if (currentOrderId) loadOrderDetails(currentOrderId);
    }, 5000);
  }
}

// Track by Mobile Phone
async function trackByPhone(e) {
  e.preventDefault();
  const phoneInput = document.getElementById("phone-input").value.trim();
  if (!phoneInput || phoneInput.length < 10) {
    alert("Please enter a valid 10-digit mobile number");
    return;
  }

  const resultsDiv = document.getElementById("phone-results-list");
  resultsDiv.innerHTML = `<p style="color: #64748b; font-size: 13px;">Searching orders...</p>`;

  try {
    const res = await fetch(`/api/orders/by-phone/${phoneInput}`);
    const orders = await res.json();

    if (orders.length === 0) {
      resultsDiv.innerHTML = `<p style="color: #ef4444; font-size: 13px;">No recent orders found for this mobile number.</p>`;
      return;
    }

    resultsDiv.innerHTML = orders.map(o => `
      <div style="background: white; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 8px; cursor: pointer;"
           onclick="window.location.href='/track?order_id=${o.id}'">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #0f172a; font-size: 14px;">#${o.id}</strong>
          <span style="font-size: 11px; font-weight: 700; color: #0c831f; background: #e8f5e9; padding: 2px 8px; border-radius: 6px;">
            ${o.order_status}
          </span>
        </div>
        <p style="font-size: 12px; color: #475569; margin: 4px 0;">
          Flat ${o.flat_no}, ${o.tower}, ${o.society_name}
        </p>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
          <span>${o.items.length} items • ₹${o.total_amount}</span>
          <span>${o.created_at}</span>
        </div>
      </div>
    `).join("");

  } catch (err) {
    resultsDiv.innerHTML = `<p style="color: #ef4444; font-size: 13px;">Failed to load orders: ${err.message}</p>`;
  }
}
