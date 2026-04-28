/* ============================================================
   COSMIC FOUNDATIONS — JAVASCRIPT
   ============================================================ */

// ============================================================
// CUSTOM CURSOR
// ============================================================
const cur  = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');

document.addEventListener('mousemove', e => {
  cur.style.left = e.clientX + 'px';
  cur.style.top  = e.clientY + 'px';
  setTimeout(() => {
    ring.style.left = e.clientX + 'px';
    ring.style.top  = e.clientY + 'px';
  }, 60);
});

// ============================================================
// STAR FIELD
// ============================================================
(function buildStars() {
  const sf = document.getElementById('starfield');
  for (let i = 0; i < 180; i++) {
    const s  = document.createElement('div');
    s.className = 'star';
    const sz = Math.random() * 2.5 + 0.5;
    s.style.cssText = `
      width:${sz}px; height:${sz}px;
      left:${Math.random() * 100}%; top:${Math.random() * 100}%;
      --d:${(Math.random() * 4 + 2).toFixed(1)}s;
      --delay:${(Math.random() * 5).toFixed(1)}s;
      --min-op:${(Math.random() * 0.15 + 0.05).toFixed(2)};
      --max-op:${(Math.random() * 0.7  + 0.2).toFixed(2)};
    `;
    sf.appendChild(s);
  }
})();

// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
  bkashNumber: '01913300821',
  nagadNumber:  '01913300821'
};

// ============================================================
// STATE
// ============================================================
let products        = JSON.parse(localStorage.getItem('cf_products') || '[]');
let orders          = JSON.parse(localStorage.getItem('cf_orders')   || '[]');
let cart            = [];
let currentFilter   = 'All';
let editingProductId = null;
let selectedPayment  = null;
let pendingImageData = [];

function saveData() {
  localStorage.setItem('cf_products', JSON.stringify(products));
  localStorage.setItem('cf_orders',   JSON.stringify(orders));
}

// ============================================================
// PRODUCTS — RENDER
// ============================================================
function renderProducts() {
  const grid     = document.getElementById('product-grid');
  const filtered = currentFilter === 'All'
    ? products
    : products.filter(p => p.category === currentFilter);

  document.getElementById('product-count').textContent =
    products.length + ' item' + (products.length !== 1 ? 's' : '');

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✦</div>
        <p>${products.length === 0
          ? 'No products yet — add some from the admin panel.'
          : 'No products in this category.'}</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" onclick="openDetail('${p.id}')">
      <div class="product-img-wrap">
        ${p.images && p.images.length > 0
          ? `<img src="${p.images[0]}" alt="${p.name}">`
          : `<div class="product-emoji">${p.emoji || '📦'}</div>`}
        ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
        <div class="product-overlay">
          <button class="product-quick-add"
            onclick="event.stopPropagation(); addToCart('${p.id}', 1)">
            Add to Cart ✦
          </button>
        </div>
      </div>
      <div class="product-info">
        <div class="product-category">${p.category || 'Gadget'}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">৳${Number(p.price).toLocaleString()}</div>
        <div class="product-stock ${p.stock < 10 ? 'low' : ''}">
          ${p.stock > 0
            ? (p.stock < 10 ? `Only ${p.stock} left` : 'In Stock')
            : 'Out of Stock'}
        </div>
      </div>
    </div>
  `).join('');

  // rebuild filter bar
  const cats = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  document.getElementById('filter-bar').innerHTML = cats.map(c => `
    <button class="filter-chip ${currentFilter === c ? 'active' : ''}"
      onclick="filterProducts('${c}')">${c}</button>
  `).join('');
}

function filterProducts(cat) {
  currentFilter = cat;
  renderProducts();
}

// ============================================================
// PRODUCT DETAIL MODAL
// ============================================================
function openDetail(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  document.getElementById('detail-modal-title').textContent = p.name;
  document.getElementById('detail-content').innerHTML = `
    <div class="product-detail-img">
      ${p.images && p.images.length > 0
        ? `<img src="${p.images[0]}" alt="${p.name}" style="max-height:400px;">`
        : `<div style="font-size:80px;">${p.emoji || '📦'}</div>`}
    </div>
    <div class="product-detail-info">
      <div class="pd-category">${p.category || 'Gadget'}</div>
      <div class="pd-name">${p.name}</div>
      <div class="pd-price">৳${Number(p.price).toLocaleString()}</div>
      <div class="pd-desc">${p.description || ''}</div>
      <div class="pd-stock">
        ${p.stock > 0
          ? `In Stock · ${p.stock} units available`
          : 'Out of Stock'}
      </div>
      <div class="qty-row">
        <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-dim);">Qty</div>
        <div class="qty-control">
          <button class="qty-btn" onclick="adjustDetailQty(-1)">−</button>
          <span class="qty-num" id="detail-qty">1</span>
          <button class="qty-btn" onclick="adjustDetailQty(1)">+</button>
        </div>
      </div>
      <button class="btn-primary btn-full"
        onclick="addToCart('${p.id}', parseInt(document.getElementById('detail-qty').textContent)); closeDetailModal();">
        Add to Cart ✦
      </button>
    </div>
  `;
  document.getElementById('detail-overlay').classList.add('open');
}

function adjustDetailQty(delta) {
  const el = document.getElementById('detail-qty');
  el.textContent = Math.max(1, parseInt(el.textContent) + delta);
}

function closeDetailModal() {
  document.getElementById('detail-overlay').classList.remove('open');
}

function closeDetail(e) {
  if (e.target === document.getElementById('detail-overlay')) closeDetailModal();
}

// ============================================================
// CART
// ============================================================
function addToCart(id, qty = 1) {
  const p = products.find(x => x.id === id);
  if (!p || p.stock < 1) { showToast('Out of stock', 'error'); return; }

  const existing = cart.find(x => x.id === id);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, p.stock);
  } else {
    cart.push({
      id, name: p.name, price: p.price,
      emoji: p.emoji, images: p.images,
      qty, category: p.category
    });
  }
  updateCartBadge();
  renderCart();
  showToast(`${p.name} added to cart ✦`, 'success');
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  updateCartBadge();
  renderCart();
}

function updateCartQty(id, delta) {
  const item = cart.find(x => x.id === id);
  const p    = products.find(x => x.id === id);
  if (!item) return;
  item.qty = Math.max(1, Math.min(item.qty + delta, p ? p.stock : 99));
  if (item.qty < 1) removeFromCart(id);
  else { updateCartBadge(); renderCart(); }
}

function cartTotal() {
  return cart.reduce((sum, x) => sum + x.price * x.qty, 0);
}

function updateCartBadge() {
  document.getElementById('cart-badge').textContent =
    cart.reduce((sum, x) => sum + x.qty, 0);
}

function renderCart() {
  document.getElementById('cart-total').textContent =
    '৳' + cartTotal().toLocaleString();

  const body = document.getElementById('cart-body');
  if (cart.length === 0) {
    body.innerHTML = `
      <div style="text-align:center; padding:60px 0; color:var(--text-muted);">
        <div style="font-size:36px; margin-bottom:12px; opacity:0.4;">✦</div>
        <div style="font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:300;">
          Your cart is empty
        </div>
      </div>`;
    return;
  }

  body.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        ${item.images && item.images.length > 0
          ? `<img src="${item.images[0]}" alt="${item.name}">`
          : `<div style="font-size:28px;">${item.emoji || '📦'}</div>`}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">৳${(item.price * item.qty).toLocaleString()}</div>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">✕</button>
    </div>
  `).join('');
}

function openCart() {
  renderCart();
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-drawer').classList.add('open');
}

function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-drawer').classList.remove('open');
}

// ============================================================
// CHECKOUT
// ============================================================
let checkoutStep = 1;

function startCheckout() {
  if (cart.length === 0) { showToast('Your cart is empty', 'error'); return; }
  closeCart();
  checkoutStep = 1;
  showCheckoutStep(1);
  document.getElementById('payment-total').textContent =
    '৳' + cartTotal().toLocaleString();
  document.getElementById('bkash-number').textContent = CONFIG.bkashNumber;
  document.getElementById('nagad-number').textContent  = CONFIG.nagadNumber;
  document.getElementById('checkout-overlay').classList.add('open');
}

function showCheckoutStep(n) {
  document.querySelectorAll('.checkout-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('co-step-' + n)?.classList.add('active');
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if      (i + 1 < n)  s.classList.add('done');
    else if (i + 1 === n) s.classList.add('active');
  });
}

function goStep1() { checkoutStep = 1; showCheckoutStep(1); }

function goStep2() {
  const fname   = document.getElementById('co-fname').value.trim();
  const email   = document.getElementById('co-email').value.trim();
  const phone   = document.getElementById('co-phone').value.trim();
  const address = document.getElementById('co-address').value.trim();
  const city    = document.getElementById('co-city').value.trim();
  if (!fname || !email || !phone || !address || !city) {
    showToast('Please fill all required fields', 'error'); return;
  }
  checkoutStep = 2; showCheckoutStep(2);
}

function selectPayment(el, type) {
  document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedPayment = type;
  document.querySelectorAll('.pay-instruction').forEach(i => i.classList.remove('visible'));
  document.getElementById(type === 'cod' ? 'cod-instr' : type + '-instr').classList.add('visible');
}

function goStep3() {
  if (!selectedPayment) { showToast('Please select a payment method', 'error'); return; }
  if (
    (selectedPayment === 'bkash' && !document.getElementById('bkash-txid').value.trim()) ||
    (selectedPayment === 'nagad' && !document.getElementById('nagad-txid').value.trim())
  ) {
    showToast('Please enter your Transaction ID', 'error'); return;
  }

  const txid = selectedPayment !== 'cod'
    ? (document.getElementById(selectedPayment + '-txid')?.value || '')
    : '';

  document.getElementById('order-review').innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;">
        Order Summary
      </div>
      ${cart.map(i => `
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--border);">
          <span style="color:var(--text-dim);">${i.name} × ${i.qty}</span>
          <span style="font-family:'DM Mono',monospace;color:var(--gold);">৳${(i.price * i.qty).toLocaleString()}</span>
        </div>
      `).join('')}
      <div style="display:flex;justify-content:space-between;font-size:16px;margin-top:12px;">
        <span>Total</span>
        <span style="font-family:'DM Mono',monospace;color:var(--gold);">৳${cartTotal().toLocaleString()}</span>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);">
      <span style="color:var(--text-muted);letter-spacing:0.15em;text-transform:uppercase;font-size:10px;">Customer</span><br>
      ${document.getElementById('co-fname').value} ${document.getElementById('co-lname').value}
      · ${document.getElementById('co-phone').value}<br>
      ${document.getElementById('co-address').value}, ${document.getElementById('co-city').value}
    </div>
    <div style="margin-top:12px;font-size:12px;">
      <span style="color:var(--text-muted);letter-spacing:0.15em;text-transform:uppercase;font-size:10px;">Payment</span><br>
      <span style="color:var(--gold);">
        ${selectedPayment === 'bkash' ? 'bKash'
          : selectedPayment === 'nagad' ? 'Nagad'
          : 'Cash on Delivery'}
        ${txid ? '· TrxID: ' + txid : ''}
      </span>
    </div>
  `;
  checkoutStep = 3; showCheckoutStep(3);
}

function placeOrder() {
  const txid = selectedPayment !== 'cod'
    ? (document.getElementById(selectedPayment + '-txid')?.value || '')
    : 'N/A';

  const order = {
    id:       'CF-' + Date.now(),
    date:     new Date().toLocaleDateString('en-BD'),
    customer: {
      name:    document.getElementById('co-fname').value + ' ' + document.getElementById('co-lname').value,
      email:   document.getElementById('co-email').value,
      phone:   document.getElementById('co-phone').value,
      address: document.getElementById('co-address').value + ', '
               + document.getElementById('co-city').value
               + (document.getElementById('co-district').value
                  ? ', ' + document.getElementById('co-district').value : '')
    },
    items:   [...cart],
    total:   cartTotal(),
    payment: selectedPayment,
    txid,
    status: 'pending'
  };

  // deduct stock
  order.items.forEach(item => {
    const p = products.find(x => x.id === item.id);
    if (p) p.stock = Math.max(0, p.stock - item.qty);
  });

  orders.unshift(order);
  saveData();

  cart = [];
  updateCartBadge();

  document.querySelectorAll('.checkout-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('co-success').classList.add('active');
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

  renderProducts();
}

function closeCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open');
}
function closeCheckoutEv(e) {
  if (e.target === document.getElementById('checkout-overlay')) closeCheckout();
}

// ============================================================
// SECRET ADMIN TRIGGER
// ============================================================
let secretClicks = 0;
let secretTimer  = null;

function secretClick() {
  secretClicks++;
  clearTimeout(secretTimer);
  secretTimer = setTimeout(() => { secretClicks = 0; }, 3000);
  if (secretClicks >= 6) {
    secretClicks = 0;
    clearTimeout(secretTimer);
    openAdminModal();
  }
}

function openAdminModal() {
  document.getElementById('admin-login-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('admin-id-input').focus(), 100);
}

function closeAdminModal() {
  document.getElementById('admin-login-modal').style.display = 'none';
  document.getElementById('admin-id-input').value   = '';
  document.getElementById('admin-pass-input').value = '';
  document.getElementById('login-err').style.display = 'none';
}

function adminLogin() {
  const id   = document.getElementById('admin-id-input').value.trim();
  const pass = document.getElementById('admin-pass-input').value;
  if (id === 'cosmic' && pass === 'satorugojoxotsutsukishibai_#X1') {
    closeAdminModal();
    document.getElementById('admin-page').style.display = 'block';
    document.body.style.overflow = 'hidden';
    updateStats();
    renderOrders();
    renderManageProducts();
    adminTab('overview', document.getElementById('anav-overview'));
  } else {
    document.getElementById('login-err').style.display = 'block';
    document.getElementById('admin-pass-input').value  = '';
  }
}

function adminLogout() {
  document.getElementById('admin-page').style.display = 'none';
  document.body.style.overflow = '';
}

// ============================================================
// ADMIN TABS
// ============================================================
function adminTab(tab, btn) {
  document.querySelectorAll('.admin-nav-item').forEach(b => {
    b.style.borderLeftColor = 'transparent';
    b.style.color           = 'var(--text-dim)';
    b.style.background      = 'none';
  });
  btn.style.borderLeftColor = 'var(--gold)';
  btn.style.color           = 'var(--gold)';
  btn.style.background      = 'rgba(201,168,76,0.04)';

  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');

  if (tab === 'manage')   renderManageProducts();
  if (tab === 'orders')   renderOrders();
  if (tab === 'overview') updateStats();
}

// ============================================================
// ADMIN — STATS
// ============================================================
function updateStats() {
  const pending = orders.filter(o => o.status === 'pending').length;
  const total   = orders.reduce((s, o) => s + o.total, 0);
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Products</div>
      <div class="stat-val">${products.length}</div>
      <div class="stat-sub">in catalog</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Orders</div>
      <div class="stat-val">${orders.length}</div>
      <div class="stat-sub">${pending} pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Revenue</div>
      <div class="stat-val">৳${total.toLocaleString()}</div>
      <div class="stat-sub">lifetime</div>
    </div>
  `;
}

// ============================================================
// ADMIN — PRODUCT FORM
// ============================================================
function handleImgUpload(input) {
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      pendingImageData.push(e.target.result);
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  document.getElementById('img-preview-grid').innerHTML =
    pendingImageData.map((src, i) => `
      <div class="img-thumb">
        <img src="${src}" alt="">
        <button class="img-thumb-remove" onclick="removeImg(${i})">✕</button>
      </div>
    `).join('');
}

function removeImg(i) {
  pendingImageData.splice(i, 1);
  renderImagePreviews();
}

function saveProduct() {
  const name  = document.getElementById('p-name').value.trim();
  const cat   = document.getElementById('p-cat').value.trim();
  const price = parseFloat(document.getElementById('p-price').value);
  const stock = parseInt(document.getElementById('p-stock').value);
  const desc  = document.getElementById('p-desc').value.trim();

  if (!name || !cat || !price || !stock || !desc) {
    showToast('Please fill all required fields', 'error'); return;
  }

  const product = {
    id:          editingProductId || 'p-' + Date.now(),
    name, category: cat, price, stock,
    badge:       document.getElementById('p-badge').value.trim(),
    emoji:       document.getElementById('p-emoji').value.trim() || '📦',
    description: desc,
    images:      pendingImageData.length > 0 ? [...pendingImageData] : []
  };

  if (editingProductId) {
    const idx = products.findIndex(p => p.id === editingProductId);
    if (idx !== -1) products[idx] = product;
    showToast('Product updated ✦', 'success');
  } else {
    products.push(product);
    showToast('Product added ✦', 'success');
  }

  saveData();
  renderProducts();
  clearProductForm();
  renderManageProducts();
}

function clearProductForm() {
  editingProductId = null;
  pendingImageData = [];
  ['p-name','p-cat','p-price','p-stock','p-badge','p-emoji','p-desc']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('img-preview-grid').innerHTML = '';
  document.getElementById('p-imgs').value              = '';
  document.getElementById('add-form-title').textContent = 'Add New Product';
  document.getElementById('save-product-btn').textContent = 'Add Product ✦';
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingProductId = id;
  pendingImageData = [...(p.images || [])];
  document.getElementById('p-name').value  = p.name;
  document.getElementById('p-cat').value   = p.category;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-stock').value = p.stock;
  document.getElementById('p-badge').value = p.badge || '';
  document.getElementById('p-emoji').value = p.emoji || '';
  document.getElementById('p-desc').value  = p.description || '';
  renderImagePreviews();
  document.getElementById('add-form-title').textContent     = 'Edit: ' + p.name;
  document.getElementById('save-product-btn').textContent   = 'Save Changes ✦';
  adminTab('add-product', document.getElementById('anav-add-product'));
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  products = products.filter(p => p.id !== id);
  saveData();
  renderProducts();
  renderManageProducts();
  updateStats();
  showToast('Product deleted', 'success');
}

function renderManageProducts() {
  const c = document.getElementById('manage-product-list');
  if (products.length === 0) {
    c.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:32px 0;">No products yet. Add some!</div>`;
    return;
  }
  c.innerHTML = `
    <table class="orders-table">
      <thead><tr>
        <th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${products.map(p => `
          <tr>
            <td style="width:48px;">
              ${p.images && p.images.length > 0
                ? `<img src="${p.images[0]}" style="width:40px;height:40px;object-fit:cover;">`
                : `<div style="font-size:28px;">${p.emoji || '📦'}</div>`}
            </td>
            <td style="font-weight:500;">${p.name}</td>
            <td style="color:var(--text-dim);">${p.category}</td>
            <td style="font-family:'DM Mono',monospace;color:var(--gold);">
              ৳${Number(p.price).toLocaleString()}
            </td>
            <td style="color:${p.stock < 5 ? 'var(--red)' : p.stock < 15 ? '#e08050' : 'var(--green)'};">
              ${p.stock}
            </td>
            <td>
              <button class="status-btn" onclick="editProduct('${p.id}')"
                style="margin-right:8px;">Edit</button>
              <button class="status-btn" onclick="deleteProduct('${p.id}')"
                style="color:var(--red);">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ============================================================
// ADMIN — ORDERS
// ============================================================
function renderOrders() {
  const c = document.getElementById('orders-container');
  if (orders.length === 0) {
    c.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:32px 0;">No orders yet.</div>`;
    return;
  }
  c.innerHTML = `
    <table class="orders-table">
      <thead><tr>
        <th>Order ID</th><th>Date</th><th>Customer</th>
        <th>Total</th><th>Payment</th><th>Status</th><th>Action</th>
      </tr></thead>
      <tbody>
        ${orders.map(o => `
          <tr>
            <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--gold-dim);">${o.id}</td>
            <td style="color:var(--text-dim);font-size:12px;">${o.date}</td>
            <td>
              <div style="font-weight:500;">${o.customer.name}</div>
              <div style="font-size:11px;color:var(--text-dim);">${o.customer.phone}</div>
            </td>
            <td style="font-family:'DM Mono',monospace;color:var(--gold);">
              ৳${o.total.toLocaleString()}
            </td>
            <td style="text-transform:capitalize;">
              ${o.payment}
              ${o.txid && o.txid !== 'N/A'
                ? `<br><span style="font-size:10px;color:var(--text-muted);">${o.txid}</span>`
                : ''}
            </td>
            <td><span class="order-status status-${o.status}">${o.status}</span></td>
            <td>
              <select onchange="updateOrderStatus('${o.id}', this.value)"
                style="background:var(--surface);border:1px solid var(--border);
                       color:var(--text);padding:6px 10px;font-size:11px;
                       cursor:none;font-family:'Syne',sans-serif;">
                <option value="pending"   ${o.status === 'pending'   ? 'selected' : ''}>Pending</option>
                <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
              </select>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function updateOrderStatus(id, status) {
  const o = orders.find(x => x.id === id);
  if (o) { o.status = status; saveData(); renderOrders(); updateStats(); }
  showToast(`Order ${id} marked as ${status}`, 'success');
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✦' : '⚠'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity    = '0';
    toast.style.transform  = 'translateX(20px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ============================================================
// INIT
// ============================================================
renderProducts();
