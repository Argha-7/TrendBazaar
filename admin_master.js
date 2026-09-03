// admin_master.js - Bulletproof Next-Gen Master Admin Engine

// Safe Supabase & Auth references
function getSupabase() {
  return window.supabase || (window.supabaseClient) || null;
}

let allProductsCache = [];
let allOrdersCache = [];

// ---------- Toast Notifications ----------
function showAdminToast(msg, type = 'info') {
  let container = document.getElementById('adminToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'adminToastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="${type === 'error' ? 'ri-error-warning-fill' : 'ri-checkbox-circle-fill'}"></i> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---------- Dark / Light Theme Engine ----------
function switchTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('adminTheme', newTheme);
  updateThemeIcon(newTheme);
}

function loadSavedTheme() {
  const saved = localStorage.getItem('adminTheme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeToggle')?.querySelector('i');
  if (icon) {
    icon.className = theme === 'dark' ? 'ri-moon-line' : 'ri-sun-line';
  }
}

// ---------- View Router & Tab Switching Engine (100% Reliable) ----------
function showView(viewId) {
  if (!viewId) viewId = 'dashboard';
  
  const sections = document.querySelectorAll('.adm-view-section');
  const navItems = document.querySelectorAll('.adm-nav-item');
  const pageTitle = document.getElementById('admPageHeaderTitle');

  const titles = {
    dashboard: 'Overview Dashboard',
    products: 'Products Catalog',
    orders: 'Orders & Fulfillment',
    users: 'Customers & Access Roles',
    wishlist: 'Customer Wishlists',
    settings: 'Site Customizer & Live Branding'
  };

  sections.forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  navItems.forEach(n => n.classList.remove('active'));

  const targetSec = document.getElementById(viewId);
  if (targetSec) {
    targetSec.classList.add('active');
    targetSec.style.display = 'block';
  }

  const targetNav = document.querySelector(`.adm-nav-item[data-view="${viewId}"]`);
  if (targetNav) {
    targetNav.classList.add('active');
  }

  if (pageTitle && titles[viewId]) {
    pageTitle.textContent = titles[viewId];
  }

  if (window.location.hash !== `#${viewId}`) {
    history.replaceState(null, null, `#${viewId}`);
  }
}

function initNav() {
  const navItems = document.querySelectorAll('.adm-nav-item');
  
  navItems.forEach(item => {
    // Remove old listeners by cloning or direct onclick
    item.onclick = (e) => {
      e.preventDefault();
      const viewId = item.getAttribute('data-view');
      showView(viewId);
    };
  });

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    showView(hash);
  });

  const initialHash = window.location.hash.replace('#', '') || 'dashboard';
  showView(initialHash);
}

// ---------- Dashboard Metrics & Profit Engine ----------
async function loadMetrics() {
  const sb = getSupabase();
  if (!sb) return;

  try {
    // 1. Users Count
    const { count: usersCount } = await sb.from('profiles').select('id', { count: 'exact', head: true });
    const uEl = document.getElementById('val-users');
    if (uEl) uEl.textContent = usersCount || '0';

    // 2. Products Count
    const { data: prods } = await sb.from('products').select('*');
    const prodCount = prods ? prods.length : 0;
    const pEl = document.getElementById('val-products');
    if (pEl) pEl.textContent = prodCount;
    const bProd = document.getElementById('badge-products-count');
    if (bProd) bProd.textContent = prodCount;
    if (prods) allProductsCache = prods;

    // 3. Orders & Revenue & Net Profit
    const { data: orders } = await sb.from('orders').select('*');
    const orderCount = orders ? orders.length : 0;
    const oEl = document.getElementById('val-orders');
    if (oEl) oEl.textContent = orderCount;
    const bOrd = document.getElementById('badge-orders-count');
    if (bOrd) bOrd.textContent = orderCount;
    if (orders) allOrdersCache = orders;

    let totalRevenue = 0;
    let totalProfit = 0;

    if (orders && orders.length > 0) {
      orders.forEach(o => {
        const selling = Number(o.product_price) || 0;
        totalRevenue += selling;
        const profit = o.profit ? Number(o.profit) : Math.round(selling * 0.42);
        totalProfit += profit;
      });
    }

    const revEl = document.getElementById('val-revenue');
    if (revEl) revEl.textContent = `₹${totalRevenue.toLocaleString()}`;
    const profEl = document.getElementById('val-profit');
    if (profEl) profEl.textContent = `₹${totalProfit.toLocaleString()}`;
  } catch (e) {
    console.error('Error loading metrics:', e);
  }
}

// ---------- Products Table Renderer ----------
async function renderProducts(prodsToRender = null) {
  const wrapper = document.getElementById('productsTableWrapper');
  if (!wrapper) return;

  const sb = getSupabase();
  let prods = prodsToRender;

  if (!prods && sb) {
    try {
      const { data, error } = await sb.from('products').select('*').order('id', { ascending: false });
      if (!error && data) {
        prods = data;
        allProductsCache = prods;
      }
    } catch (_) {}
  }

  if (!prods) prods = allProductsCache;

  const countBadge = document.getElementById('prodTableCountBadge');
  if (countBadge) countBadge.textContent = `${prods.length} Products`;

  if (prods.length === 0) {
    wrapper.innerHTML = `
      <div style="padding: 48px 20px; text-align: center; color: var(--adm-text-muted);">
        <i class="ri-inbox-line" style="font-size: 3rem; display: block; margin-bottom: 10px; color: var(--adm-border-strong);"></i>
        <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--adm-text-main);">No Products Found</h4>
        <p style="font-size: 0.85rem; margin-top: 4px;">Click "+ Import from Meesho" or "+ Add Product" to publish your first product.</p>
      </div>
    `;
    return;
  }

  let html = `
    <table class="adm-table">
      <thead>
        <tr>
          <th>Product Item</th>
          <th>Category</th>
          <th>Meesho Cost</th>
          <th>Selling Price</th>
          <th>Est. Profit</th>
          <th>Rating</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  prods.forEach(p => {
    const imgUrl = (Array.isArray(p.images) && p.images.length > 0) ? p.images[0] : (p.image || 'assets/hero_fashion.jpg');
    const cost = p.meesho_price || p.meeshoPrice || Math.round((p.price || 0) * 0.55);
    const selling = p.price || p.sellingPrice || 0;
    const profit = Math.max(0, selling - cost);

    html += `
      <tr>
        <td>
          <div class="adm-product-cell">
            <img src="${imgUrl}" class="adm-prod-thumb" alt="${p.title}" onerror="this.src='assets/hero_fashion.jpg'">
            <div class="adm-prod-info">
              <span class="adm-prod-title" title="${p.title}">${p.title}</span>
              <span class="adm-prod-cat">ID: #${p.id} • ${p.discount || 'Special Offer'}</span>
            </div>
          </div>
        </td>
        <td><span class="adm-badge adm-badge-blue">${p.category || 'General'}</span></td>
        <td style="font-weight: 700; color: var(--adm-text-muted);">₹${cost}</td>
        <td style="font-weight: 800; color: var(--adm-text-main);">₹${selling}</td>
        <td>
          <span class="adm-badge adm-badge-success">
            <i class="ri-arrow-up-line"></i> +₹${profit}
          </span>
        </td>
        <td>
          <span style="font-weight: 800; color: #f59e0b; display: flex; align-items: center; gap: 3px;">
            <i class="ri-star-fill"></i> ${p.rating || 4.5}
          </span>
        </td>
        <td>
          <div class="adm-action-btns">
            <a href="product.html?id=${p.id}" target="_blank" class="adm-action-btn" title="View on Storefront">
              <i class="ri-external-link-line"></i>
            </a>
            <button class="adm-action-btn" onclick="openEditProductModal(${p.id})" title="Edit Details">
              <i class="ri-edit-line"></i>
            </button>
            <button class="adm-action-btn delete" onclick="deleteProductById(${p.id})" title="Delete Product">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;
}

function filterProductsTable() {
  const query = document.getElementById('prodFilterInput').value.toLowerCase().trim();
  if (!query) {
    renderProducts(allProductsCache);
    return;
  }
  const filtered = allProductsCache.filter(p => 
    (p.title && p.title.toLowerCase().includes(query)) ||
    (p.category && p.category.toLowerCase().includes(query))
  );
  renderProducts(filtered);
}

async function deleteProductById(id) {
  if (!confirm(`Are you sure you want to permanently delete product #${id}?`)) return;
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) {
    showAdminToast('Error deleting product: ' + error.message, 'error');
  } else {
    showAdminToast('🎉 Product deleted successfully', 'success');
    renderProducts();
    loadMetrics();
  }
}

function openEditProductModal(id) {
  window.location.href = `admin_add_product.html?id=${id}`;
}

// ---------- Orders Table Renderer ----------
async function renderOrders(ordersToRender = null) {
  const wrapper = document.getElementById('ordersTableWrapper');
  if (!wrapper) return;

  const sb = getSupabase();
  let orders = ordersToRender;

  if (!orders && sb) {
    try {
      const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        orders = data;
        allOrdersCache = orders;
      }
    } catch (_) {}
  }

  if (!orders) orders = allOrdersCache;

  const countBadge = document.getElementById('ordersTableCountBadge');
  if (countBadge) countBadge.textContent = `${orders.length} Orders`;

  if (orders.length === 0) {
    wrapper.innerHTML = `
      <div style="padding: 48px 20px; text-align: center; color: var(--adm-text-muted);">
        <i class="ri-shopping-bag-3-line" style="font-size: 3rem; display: block; margin-bottom: 10px; color: var(--adm-border-strong);"></i>
        <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--adm-text-main);">No Orders Yet</h4>
        <p style="font-size: 0.85rem; margin-top: 4px;">Orders placed on the live storefront will appear here instantly with full customer address & phone details.</p>
      </div>
    `;
    return;
  }

  let html = `
    <table class="adm-table">
      <thead>
        <tr>
          <th>Order ID & Date</th>
          <th>Product Info</th>
          <th>Customer Details</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  orders.forEach(o => {
    const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent';
    const status = o.status || 'Order Placed';

    html += `
      <tr>
        <td>
          <span style="font-weight: 800; font-family: monospace;">#ORD-${o.id}</span><br>
          <span style="font-size: 0.74rem; color: var(--adm-text-muted);">${dateStr}</span>
        </td>
        <td>
          <div class="adm-product-cell">
            <img src="${o.product_image || 'assets/hero_fashion.jpg'}" class="adm-prod-thumb" alt="" onerror="this.src='assets/hero_fashion.jpg'">
            <div class="adm-prod-info">
              <span class="adm-prod-title" style="max-width: 200px;">${o.product_title || 'Item'}</span>
              <span class="adm-prod-cat">Size: <strong>${o.size || 'Free Size'}</strong></span>
            </div>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; font-size: 0.82rem;">
            <strong style="color: var(--adm-text-main);">${o.customer_name || 'Customer'}</strong>
            <span style="color: var(--adm-primary); font-weight: 700;">📞 ${o.customer_phone || 'N/A'}</span>
            <span style="color: var(--adm-text-muted); font-size: 0.74rem; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.customer_address || ''}">
              📍 ${o.customer_address || 'Delivery Address'}
            </span>
          </div>
        </td>
        <td>
          <span style="font-size: 0.95rem; font-weight: 800; color: var(--adm-text-main);">₹${o.product_price || o.total_price || 0}</span><br>
          <span class="adm-badge adm-badge-gray" style="font-size: 0.68rem;">Cash on Delivery</span>
        </td>
        <td>
          <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding: 6px 10px; border-radius: var(--adm-radius-sm); font-size: 0.8rem; font-weight: 700; border: 1px solid var(--adm-border); background: var(--adm-surface-subtle); color: var(--adm-text-main); cursor: pointer;">
            <option value="Order Placed" ${status === 'Order Placed' ? 'selected' : ''}>⏳ Order Placed</option>
            <option value="Confirmed" ${status === 'Confirmed' ? 'selected' : ''}>✅ Confirmed</option>
            <option value="Shipped" ${status === 'Shipped' ? 'selected' : ''}>📦 Shipped</option>
            <option value="Out for Delivery" ${status === 'Out for Delivery' ? 'selected' : ''}>🚚 Out for Delivery</option>
            <option value="Delivered" ${status === 'Delivered' ? 'selected' : ''}>🎉 Delivered</option>
            <option value="Cancelled" ${status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
          </select>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <a href="https://api.whatsapp.com/send?phone=91${(o.customer_phone || '').replace(/\D/g,'')}&text=${encodeURIComponent(`Hello ${o.customer_name || 'Customer'}, Thank you for your order on TrendBazaar! Order Reference: #${o.id} for ${o.product_title || 'Item'} (Amount: ₹${o.product_price || 0}, Payment: Cash on Delivery). Your package is being packed for fast courier dispatch! 🚚`)}" target="_blank" class="adm-action-btn" style="color: #22c55e; background: rgba(34,197,94,0.1);" title="Send 1-Click WhatsApp Order Confirmation">
              <i class="ri-whatsapp-line"></i>
            </a>
            <button class="adm-action-btn delete" onclick="deleteOrderById(${o.id})" title="Delete Order">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;
}

function filterOrdersTable() {
  const query = document.getElementById('orderFilterInput').value.toLowerCase().trim();
  if (!query) {
    renderOrders(allOrdersCache);
    return;
  }
  const filtered = allOrdersCache.filter(o => 
    (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
    (o.product_title && o.product_title.toLowerCase().includes(query)) ||
    (o.customer_phone && o.customer_phone.includes(query))
  );
  renderOrders(filtered);
}

async function updateOrderStatus(id, newStatus) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('orders').update({ status: newStatus }).eq('id', id);
  if (error) {
    showAdminToast('Failed to update status: ' + error.message, 'error');
  } else {
    showAdminToast(`🎉 Order #${id} updated to "${newStatus}"`, 'success');
  }
}

async function deleteOrderById(id) {
  if (!confirm(`Delete order #${id}?`)) return;
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('orders').delete().eq('id', id);
  if (error) {
    showAdminToast('Delete failed', 'error');
  } else {
    showAdminToast('Order deleted', 'success');
    renderOrders();
    loadMetrics();
  }
}

// ---------- Users & Roles Table ----------
async function renderUsers() {
  const wrapper = document.getElementById('usersTableWrapper');
  if (!wrapper) return;

  const sb = getSupabase();
  if (!sb) return;

  const { data: users, error } = await sb.from('profiles').select('*');
  if (error || !users || users.length === 0) {
    wrapper.innerHTML = `
      <div style="padding: 36px 20px; text-align: center; color: var(--adm-text-muted);">
        <i class="ri-user-smile-line" style="font-size: 2.5rem; display: block; margin-bottom: 8px; color: var(--adm-border-strong);"></i>
        <h4 style="font-size: 1rem; font-weight: 800; color: var(--adm-text-main);">No Customer Profiles Yet</h4>
        <p style="font-size: 0.82rem;">Customers who sign up on the store will be listed here.</p>
      </div>
    `;
    return;
  }

  let html = `
    <table class="adm-table">
      <thead>
        <tr>
          <th>User / Email</th>
          <th>Role</th>
          <th>UID</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  users.forEach(u => {
    const role = u.role || 'user';
    const isAdm = role === 'admin';
    const initial = (u.email || 'U').charAt(0).toUpperCase();

    html += `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="adm-avatar-circle" style="width: 32px; height: 32px; font-size: 0.8rem;">${initial}</div>
            <strong style="color: var(--adm-text-main);">${u.email || 'Customer'}</strong>
          </div>
        </td>
        <td>
          <span class="adm-badge ${isAdm ? 'adm-badge-blue' : 'adm-badge-gray'}">${role.toUpperCase()}</span>
        </td>
        <td style="font-family: monospace; font-size: 0.76rem; color: var(--adm-text-muted);">${u.firebase_uid || u.id}</td>
        <td>
          <button class="adm-btn-primary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="toggleUserRole('${u.firebase_uid || u.id}', '${role}')">
            ${isAdm ? 'Demote to User' : 'Promote to Admin'}
          </button>
          <button class="adm-btn-secondary" style="padding: 4px 10px; font-size: 0.75rem; margin-left: 6px;" onclick="editUserWallet('${u.firebase_uid || u.id}', '${u.email}')">
            <i class="ri-wallet-3-line"></i> Wallet
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;
}

async function toggleUserRole(uid, currentRole) {
  const sb = getSupabase();
  if (!sb) return;
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  const { error } = await sb.from('profiles').update({ role: newRole }).eq('firebase_uid', uid);
  if (error) {
    showAdminToast('Role update failed: ' + error.message, 'error');
  } else {
    showAdminToast(`User role updated to ${newRole.toUpperCase()}`, 'success');
    renderUsers();
  }
}
window.toggleUserRole = toggleUserRole;

async function editUserWallet(uid, email) {
  const sb = getSupabase();
  if (!sb) return;

  // First fetch current wallet balance
  const { data: walletData, error: walletErr } = await sb.from('wallets').select('balance').eq('firebase_uid', uid).single();
  
  let currentBalance = 0;
  if (walletData) {
    currentBalance = walletData.balance;
  }

  const newBalance = prompt(`Enter new wallet balance for ${email} (Current: ₹${currentBalance}):`, currentBalance);
  if (newBalance === null) return; // User cancelled
  
  const balance = parseFloat(newBalance);
  if (isNaN(balance)) {
    alert("Please enter a valid number");
    return;
  }

  const { error } = await sb.from('wallets').upsert({ firebase_uid: uid, balance: balance });
  if (error) {
    showAdminToast("Failed to update wallet: " + error.message, "error");
  } else {
    showAdminToast(`Wallet balance for ${email} updated to ₹${balance}`, "success");
  }
}
window.editUserWallet = editUserWallet;

// ---------- Dynamic Coupons Manager ----------
async function renderWishlists() {
  const wrapper = document.getElementById('wishlistTableWrapper');
  if (!wrapper) return;

  const sb = getSupabase();
  if (!sb) return;

  const { data: wishlists, error } = await sb.from('wishlists').select('*');
  if (error || !wishlists || wishlists.length === 0) {
    wrapper.innerHTML = `
      <div style="padding: 36px 20px; text-align: center; color: var(--adm-text-muted);">
        <i class="ri-heart-3-line" style="font-size: 2.5rem; display: block; margin-bottom: 8px; color: var(--adm-border-strong);"></i>
        <h4 style="font-size: 1rem; font-weight: 800; color: var(--adm-text-main);">No Wishlist Items Saved</h4>
        <p style="font-size: 0.82rem;">Items saved by customers will appear here.</p>
      </div>
    `;
    return;
  }

  let html = `
    <table class="adm-table">
      <thead>
        <tr>
          <th>User UID</th>
          <th>Product ID</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  wishlists.forEach(w => {
    html += `
      <tr>
        <td style="font-family: monospace; font-size: 0.8rem;">${w.firebase_uid}</td>
        <td><strong>Product #${w.product_id}</strong></td>
        <td>
          <button class="adm-action-btn delete" onclick="deleteWishlistById(${w.id})">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;
}

async function deleteWishlistById(id) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('wishlists').delete().eq('id', id);
  if (!error) {
    showAdminToast('Wishlist item deleted', 'success');
    renderWishlists();
  }
}

// ---------- Dynamic Site Customizer & Real-Time Preview ----------
async function loadSiteSettings() {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { data } = await sb.from('site_settings').select('*').eq('id', 1).single();
    if (data) {
      if (data.primary_color) {
        document.getElementById('ssPrimaryColor').value = data.primary_color;
        document.getElementById('ssPrimaryColorHex').textContent = data.primary_color;
      }
      if (data.header_bg_color) {
        document.getElementById('ssHeaderBgColor').value = data.header_bg_color;
        document.getElementById('ssHeaderBgColorHex').textContent = data.header_bg_color;
      }
      if (data.banner_image_url) {
        document.getElementById('ssBannerImage').value = data.banner_image_url;
      }
      if (data.footer_text) {
        document.getElementById('ssFooterText').value = data.footer_text;
      }
      if (data.store_name) document.getElementById('ssStoreName').value = data.store_name;
      if (data.store_logo_url) document.getElementById('ssStoreLogo').value = data.store_logo_url;
      if (data.announcement_text) document.getElementById('ssAnnouncement').value = data.announcement_text;
      if (data.support_phone) document.getElementById('ssSupportPhone').value = data.support_phone;
      if (data.social_instagram) document.getElementById('ssInstagram').value = data.social_instagram;
      if (data.social_facebook) document.getElementById('ssFacebook').value = data.social_facebook;
      updateLivePreview();
    }
  } catch (e) {
    console.error('loadSiteSettings error:', e);
  }
}

function updateLivePreview() {
  const primary = document.getElementById('ssPrimaryColor')?.value || '#2874f0';
  const headerBg = document.getElementById('ssHeaderBgColor')?.value || '#ffffff';
  const banner = document.getElementById('ssBannerImage')?.value || '';
  const footer = document.getElementById('ssFooterText')?.value || '';

  const pHex = document.getElementById('ssPrimaryColorHex');
  if (pHex) pHex.textContent = primary;
  const hHex = document.getElementById('ssHeaderBgColorHex');
  if (hHex) hHex.textContent = headerBg;

  const prevHeader = document.getElementById('previewHeader');
  if (prevHeader) prevHeader.style.background = headerBg;

  const prevBtn = document.getElementById('previewBtn');
  if (prevBtn) prevBtn.style.background = primary;

  const prevBanner = document.getElementById('previewBanner');
  if (prevBanner && banner) {
    prevBanner.style.backgroundImage = `url('${banner}')`;
  }

  const prevFooter = document.getElementById('previewFooterText');
  if (prevFooter && footer) {
    prevFooter.textContent = footer;
  }
}

document.getElementById('siteSettingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const sb = getSupabase();
  if (!sb) return;

  const primary_color = document.getElementById('ssPrimaryColor').value;
  const header_bg_color = document.getElementById('ssHeaderBgColor').value;
  const banner_image_url = document.getElementById('ssBannerImage').value;
  const footer_text = document.getElementById('ssFooterText').value;

  const store_name = document.getElementById('ssStoreName')?.value || 'TrendBazaar';
  const store_logo_url = document.getElementById('ssStoreLogo')?.value || '';
  const announcement_text = document.getElementById('ssAnnouncement')?.value || '';
  const support_phone = document.getElementById('ssSupportPhone')?.value || '';
  const social_instagram = document.getElementById('ssInstagram')?.value || '';
  const social_facebook = document.getElementById('ssFacebook')?.value || '';

  const { error } = await sb.from('site_settings').upsert({
    id: 1,
    primary_color,
    header_bg_color,
    banner_image_url,
    footer_text,
    store_name,
    store_logo_url,
    announcement_text,
    support_phone,
    social_instagram,
    social_facebook
  });

  if (error) {
    showAdminToast('❌ Failed to save branding: ' + error.message, 'error');
  } else {
    showAdminToast('🎉 Branding settings saved! Live storefront updated.', 'success');
  }
});

// ---------- Meesho Fast Import & Modal Engine ----------
function calculateMarginPreview() {
  const cost = parseFloat(document.getElementById('impCost').value) || 0;
  const price = parseFloat(document.getElementById('impPrice').value) || 0;
  const profit = Math.max(0, price - cost);
  const tag = document.getElementById('marginPreviewTag');
  if (tag) {
    tag.innerHTML = `💰 Est. Net Profit: <strong>₹${profit}</strong> per order (Margin: ${price > 0 ? Math.round((profit / price) * 100) : 0}%)`;
  }
}

function checkImportParams() {
  const params = new URLSearchParams(window.location.search);
  const title = params.get('title');
  if (!title) return;

  const cost = params.get('cost') || '0';
  const price = params.get('price') || '0';
  const mrp = params.get('mrp') || '0';
  const imgUrl = params.get('imgUrl') || '';
  const desc = params.get('desc') || '';
  const photosParam = params.get('photos');

  document.getElementById('impTitle').value = decodeURIComponent(title);
  document.getElementById('impCost').value = cost;
  document.getElementById('impPrice').value = price;
  document.getElementById('impMrp').value = mrp;
  document.getElementById('impImgUrl').value = decodeURIComponent(imgUrl);
  document.getElementById('impDesc').value = decodeURIComponent(desc);

  const row = document.getElementById('adminPhotoPresetRow');
  if (row) {
    row.innerHTML = '';
    if (photosParam) {
      try {
        const photos = JSON.parse(decodeURIComponent(photosParam));
        photos.slice(0, 8).forEach(pUrl => {
          const img = document.createElement('img');
          img.src = pUrl;
          img.style.width = '52px';
          img.style.height = '52px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '6px';
          img.style.border = '1px solid var(--adm-border)';
          row.appendChild(img);
        });
      } catch (_) {}
    }
  }

  calculateMarginPreview();
  document.getElementById('modalTitleHeading').textContent = 'Import Product from Meesho';
  document.getElementById('importModal').style.display = 'flex';
}

// Global button listeners
document.getElementById('btnOpenQuickImport')?.addEventListener('click', () => {
  window.location.href = 'admin_add_product.html';
});

document.getElementById('addProductBtn')?.addEventListener('click', () => {
  window.location.href = 'admin_add_product.html';
});

document.getElementById('importForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const sb = getSupabase();
  if (!sb) return;

  const title = document.getElementById('impTitle').value.trim();
  const cost = parseFloat(document.getElementById('impCost').value);
  const selling = parseFloat(document.getElementById('impPrice').value);
  const mrp = parseFloat(document.getElementById('impMrp').value);
  const imgUrl = document.getElementById('impImgUrl').value.trim();
  const desc = document.getElementById('impDesc').value.trim();

  const photoEls = document.querySelectorAll('#adminPhotoPresetRow img');
  let images = Array.from(photoEls).map(i => i.src);
  if (images.length === 0) images = [imgUrl];

  const params = new URLSearchParams(window.location.search);
  const sizesParam = params.get('sizes');
  const sizes = sizesParam ? decodeURIComponent(sizesParam).split(',').map(s => s.trim()) : ['Free Size'];
  const fabric = params.get('fabric') ? decodeURIComponent(params.get('fabric')) : 'Blended Fabric';
  const pattern = params.get('pattern') ? decodeURIComponent(params.get('pattern')) : 'Classic Design';

  const newProd = {
    title,
    category: 'General',
    meesho_price: cost,
    price: selling,
    original_price: mrp,
    discount: `${Math.round(((mrp - selling) / mrp) * 100)}% off`,
    rating: 4.6,
    reviews: 120,
    images,
    sizes,
    description: desc,
    specs: {
      'Fabric / Material': fabric,
      'Pattern / Style': pattern,
      'White-Label Warranty': '7 Days Instant Replacement'
    }
  };

  const { error } = await sb.from('products').insert([newProd]);
  if (error) {
    showAdminToast('❌ Error publishing product: ' + error.message, 'error');
    return;
  }

  showAdminToast('🎉 Product successfully published to live storefront!', 'success');
  renderProducts();
  loadMetrics();
  document.getElementById('importModal').style.display = 'none';
});

document.getElementById('themeToggle')?.addEventListener('click', switchTheme);
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  const a = window.auth;
  if (a) {
    a.signOut().then(() => window.location.href = 'login.html');
  } else {
    window.location.href = 'login.html';
  }
});

// ========================================================
// CATEGORY MANAGEMENT IN ADMIN MASTER
// ========================================================
function getMasterCategories() {
  const DEFAULT_CATS = ['Ethnic Wear', 'Western Wear', 'Tech & Gadgets', 'Home & Kitchen', 'Beauty & Health', 'Footwear & Bags', 'Jewellery & Accessories', 'General'];
  try {
    const saved = localStorage.getItem('tb_store_categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_CATS;
}

function renderMasterCategories() {
  const container = document.getElementById('adminMasterCatList');
  if (!container) return;

  const cats = getMasterCategories();
  container.innerHTML = '';

  cats.forEach(cat => {
    const chip = document.createElement('div');
    chip.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; background: var(--adm-surface-subtle); border: 1px solid var(--adm-border); padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; color: var(--adm-text-dark);';
    chip.innerHTML = `
      <i class="ri-price-tag-3-fill" style="color: var(--adm-primary); font-size: 0.88rem;"></i>
      <span>${cat}</span>
      <button type="button" onclick="deleteMasterCategory('${cat}')" style="background: none; border: none; color: #ef4444; font-size: 1rem; cursor: pointer; display: flex; align-items: center; padding: 0 0 0 4px;" title="Delete category">✕</button>
    `;
    container.appendChild(chip);
  });
}

function addMasterCategory() {
  const inp = document.getElementById('adminMasterNewCatInput');
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) {
    showAdminToast('Please enter a category name', 'error');
    return;
  }

  const cats = getMasterCategories();
  if (cats.some(c => c.toLowerCase() === val.toLowerCase())) {
    showAdminToast(`Category "${val}" already exists!`, 'error');
    return;
  }

  cats.push(val);
  localStorage.setItem('tb_store_categories', JSON.stringify(cats));
  renderMasterCategories();
  inp.value = '';
  showAdminToast(`✨ Category "${val}" added!`, 'success');
}
window.addMasterCategory = addMasterCategory;

function deleteMasterCategory(catName) {
  const cats = getMasterCategories();
  if (cats.length <= 1) {
    showAdminToast('You must keep at least 1 category', 'error');
    return;
  }

  if (confirm(`Are you sure you want to remove category "${catName}"?`)) {
    const updated = cats.filter(c => c !== catName);
    localStorage.setItem('tb_store_categories', JSON.stringify(updated));
    renderMasterCategories();
    showAdminToast(`🗑️ Category "${catName}" removed.`, 'info');
  }
}
window.deleteMasterCategory = deleteMasterCategory;

// ========================================================
// DYNAMIC COUPONS & PROMO CODES ENGINE
// ========================================================
const DEFAULT_STORE_COUPONS = [
  { code: 'TREND50', type: 'flat', val: 50, min: 399, status: 'active' },
  { code: 'WELCOME100', type: 'flat', val: 100, min: 699, status: 'active' },
  { code: 'SAVE10', type: 'percent', val: 10, min: 299, status: 'active' },
  { code: 'FREESHIP', type: 'flat', val: 0, min: 199, status: 'active' }
];

function getStoreCoupons() {
  try {
    const saved = localStorage.getItem('tb_store_coupons');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_STORE_COUPONS;
}

function saveStoreCoupons(coupons) {
  localStorage.setItem('tb_store_coupons', JSON.stringify(coupons));
}

function renderCoupons() {
  const wrapper = document.getElementById('couponsTableWrapper');
  if (!wrapper) return;

  const coupons = getStoreCoupons();
  const badge = document.getElementById('badge-coupons-count');
  if (badge) badge.textContent = coupons.filter(c => c.status === 'active').length;

  if (coupons.length === 0) {
    wrapper.innerHTML = `<p style="padding: 24px; text-align: center; color: var(--adm-text-muted);">No coupon codes created yet.</p>`;
    return;
  }

  let html = `
    <table class="adm-table">
      <thead>
        <tr>
          <th>Coupon Code</th>
          <th>Discount Offer</th>
          <th>Min. Order Value</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  coupons.forEach(c => {
    const discountLabel = c.type === 'percent' ? `${c.val}% OFF` : `Flat ₹${c.val} OFF`;
    const isActive = c.status === 'active';

    html += `
      <tr>
        <td>
          <span style="font-family: monospace; font-size: 0.95rem; font-weight: 800; color: var(--adm-primary); background: rgba(40,116,240,0.1); padding: 4px 10px; border-radius: 4px; border: 1px dashed var(--adm-primary);">
            ${c.code}
          </span>
        </td>
        <td>
          <strong style="color: #10b981; font-size: 0.9rem;">${discountLabel}</strong>
        </td>
        <td>
          <span style="color: var(--adm-text-main); font-weight: 700;">₹${c.min || 0}</span>
        </td>
        <td>
          <span onclick="toggleCouponStatus('${c.code}')" class="adm-badge ${isActive ? 'adm-badge-green' : 'adm-badge-gray'}" style="cursor: pointer;" title="Click to Toggle Status">
            ${isActive ? '✅ Active' : '⏸ Inactive'}
          </span>
        </td>
        <td>
          <button class="adm-action-btn delete" onclick="deleteCoupon('${c.code}')" title="Delete Coupon">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;
}

function openCouponModal() {
  document.getElementById('couponModal').style.display = 'flex';
}
window.openCouponModal = openCouponModal;

function closeCouponModal() {
  document.getElementById('couponModal').style.display = 'none';
}
window.closeCouponModal = closeCouponModal;

function handleSaveCoupon(e) {
  e.preventDefault();
  const code = document.getElementById('coupCode').value.trim().toUpperCase();
  const type = document.getElementById('coupType').value;
  const val = parseFloat(document.getElementById('coupVal').value) || 0;
  const min = parseFloat(document.getElementById('coupMinOrder').value) || 0;
  const status = document.getElementById('coupStatus').value;

  if (!code) {
    showAdminToast('Please enter a coupon code', 'error');
    return;
  }

  const coupons = getStoreCoupons();
  const existIdx = coupons.findIndex(c => c.code === code);
  if (existIdx > -1) {
    coupons[existIdx] = { code, type, val, min, status };
  } else {
    coupons.push({ code, type, val, min, status });
  }

  saveStoreCoupons(coupons);
  renderCoupons();
  closeCouponModal();
  document.getElementById('couponForm').reset();
  showAdminToast(`🎉 Coupon "${code}" saved successfully!`, 'success');
}
window.handleSaveCoupon = handleSaveCoupon;

function toggleCouponStatus(code) {
  const coupons = getStoreCoupons();
  const c = coupons.find(item => item.code === code);
  if (c) {
    c.status = c.status === 'active' ? 'inactive' : 'active';
    saveStoreCoupons(coupons);
    renderCoupons();
    showAdminToast(`Coupon "${code}" status updated to ${c.status}`, 'info');
  }
}
window.toggleCouponStatus = toggleCouponStatus;

function deleteCoupon(code) {
  if (confirm(`Delete coupon code "${code}"?`)) {
    const coupons = getStoreCoupons().filter(c => c.code !== code);
    saveStoreCoupons(coupons);
    renderCoupons();
    showAdminToast(`🗑️ Coupon "${code}" deleted.`, 'info');
  }
}
window.deleteCoupon = deleteCoupon;

const MASTER_ADMIN_EMAIL = 'biswajitsingh7899@gmail.com';

function checkMasterAdminAuth() {
  if (window.auth) {
    window.auth.onAuthStateChanged((user) => {
      if (!user || (user.email || '').toLowerCase().trim() !== MASTER_ADMIN_EMAIL.toLowerCase()) {
        localStorage.removeItem('tb_admin_authorized');
        window.location.href = 'login.html?tab=admin&reason=admin_required';
      }
    });
  }
}

// Run immediately and also on DOMContentLoaded
function bootstrapAdmin() {
  checkMasterAdminAuth();
  loadSavedTheme();
  initNav();
  loadMetrics();
  renderProducts();
  renderOrders();
  renderUsers();
  renderWishlists();
  renderCoupons();
  loadSiteSettings();
  renderMasterCategories();
  checkImportParams();
}

document.getElementById('themeToggle')?.addEventListener('click', switchTheme);
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('tb_admin_authorized');
  if (window.auth) {
    window.auth.signOut().then(() => {
      window.location.href = 'login.html?tab=admin';
    });
  } else {
    window.location.href = 'login.html?tab=admin';
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrapAdmin();
    // Mobile sidebar toggle
    const sidebarBtn = document.getElementById('admSidebarToggle');
    const sidebar = document.getElementById('admSidebar');
    if (sidebarBtn && sidebar) {
      sidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  });
} else {
  bootstrapAdmin();
}
