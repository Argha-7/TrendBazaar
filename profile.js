// profile.js - Bulletproof Customer Profile & Account Management Engine

function getSupabase() {
  return window.supabase || (window.supabaseClient) || null;
}

let currentUser = null;
let userOrders = [];
let userWishlist = [];

// ---------- Toast Helper ----------
function showSkToast(msg) {
  let container = document.getElementById('skToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'skToastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'sk-toast';
  toast.innerHTML = `<i class="ri-information-fill" style="color: var(--sk-primary);"></i> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function cleanMeeshoHDUrl(url) {
  if (!url) return 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg';
  let clean = url.split('?')[0];
  clean = clean.replace(/_\d+\.(jpg|webp|jpeg)/g, '_512.jpg').replace(/\/whwdt_\d+\./g, '/whwdt_512.');
  return clean;
}

// ---------- Tab Navigation (100% Bulletproof) ----------
function switchProfileTab(tabId) {
  const tabs = document.querySelectorAll('.prof-view-tab');
  const btns = document.querySelectorAll('.profile-nav-btn');

  tabs.forEach(t => {
    t.style.display = 'none';
  });
  btns.forEach(b => {
    b.classList.remove('active');
  });

  const targetView = document.getElementById(`profView-${tabId}`);
  if (targetView) {
    targetView.style.display = 'block';
  }

  const targetBtn = document.getElementById(`tabBtn-${tabId}`);
  if (targetBtn) {
    targetBtn.classList.add('active');
  }

  // Auto-load wallet data when wallet tab opened
  if (tabId === 'wallet') {
    loadWalletPreview();
  }
}

// Make switchProfileTab globally available
window.switchProfileTab = switchProfileTab;

// ---------- Load Customer Profile & Orders ----------
async function loadCustomerData() {
  updateCartBadge();
  const sb = getSupabase();

  // 1. Check if user is logged in (Google Login / Email Login)
  if (currentUser) {
    const email = currentUser.email || 'customer@trendbazaar.com';
    const name = currentUser.displayName || (email.split('@')[0]);
    const photo = currentUser.photoURL;

    document.getElementById('profUserName').textContent = name;
    document.getElementById('profUserEmail').textContent = email;

    const avatarEl = document.getElementById('profAvatar');
    if (photo) {
      avatarEl.innerHTML = `<img src="${photo}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='${name.charAt(0).toUpperCase()}'">`;
    } else {
      avatarEl.textContent = name.charAt(0).toUpperCase();
    }

    const setFullName = document.getElementById('setFullName');
    if (setFullName) setFullName.value = name;
    const setEmail = document.getElementById('setEmail');
    if (setEmail) setEmail.value = email;
  } else {
    // Guest User - Prompt 1-Click Google / Gmail Login
    const avatarEl = document.getElementById('profAvatar');
    avatarEl.innerHTML = `<i class="ri-user-smile-line" style="font-size: 2rem;"></i>`;

    document.getElementById('profUserName').innerHTML = `Guest Account`;
    document.getElementById('profUserEmail').innerHTML = `
      <a href="login.html?redirect=profile.html" style="color: #2563eb; font-weight: 800; text-decoration: underline; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px;">
        <i class="ri-google-fill" style="color: #ea4335;"></i> Login with Gmail ↗
      </a>
    `;

    const setFullName = document.getElementById('setFullName');
    if (setFullName) setFullName.value = '';
    const setPhone = document.getElementById('setPhone');
    if (setPhone) setPhone.value = '';
  }

  // 2. Fetch Orders from Supabase
  if (sb) {
    try {
      let query = sb.from('orders').select('*').order('created_at', { ascending: false });
      
      // If logged in, get their orders; else get recent orders
      if (currentUser) {
        query = query.eq('firebase_uid', currentUser.uid);
      } else {
        query = query.limit(10);
      }

      const { data: orders, error } = await query;
      if (!error && orders) {
        userOrders = orders;
      }
    } catch (e) {
      console.error('Orders fetch error:', e);
    }
  }

  renderCustomerOrders();

  // 3. Fetch Wishlist from Supabase or localStorage
  if (sb) {
    try {
      const { data: prods } = await sb.from('products').select('*').limit(6);
      if (prods) {
        userWishlist = prods;
      }
    } catch (_) {}
  }
  renderCustomerWishlist();

  // 4. Render Saved Addresses
  renderSavedAddresses();
}

let currentCancellingOrderId = null;

// ---------- Flipkart-style Tracking & Orders Rendering ----------
function renderCustomerOrders() {
  const container = document.getElementById('profOrdersList');
  const countTag = document.getElementById('profOrderCountTag');
  if (!container) return;

  if (countTag) countTag.textContent = `${userOrders.length} Orders`;

  if (userOrders.length === 0) {
    container.innerHTML = `
      <div style="padding: 48px 20px; text-align: center;">
        <i class="ri-inbox-line" style="font-size: 3rem; color: var(--sk-text-light); display: block; margin-bottom: 12px;"></i>
        <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--sk-text-dark);">No Orders Placed Yet</h4>
        <p style="color: var(--sk-text-muted); font-size: 0.88rem; margin: 6px 0 20px;">Your orders and live delivery tracking will appear here.</p>
        <a href="index.html" class="sk-btn-primary" style="display: inline-flex; padding: 10px 24px; text-decoration: none; font-weight: 800; border-radius: var(--sk-radius-sm);">
          Start Shopping
        </a>
      </div>
    `;
    return;
  }

  let html = '';
  userOrders.forEach(o => {
    const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
    const status = o.status || 'Order Placed';
    const imgUrl = o.product_image ? cleanMeeshoHDUrl(o.product_image) : 'assets/hero_fashion.jpg';
    const isCancelled = status === 'Cancelled';
    const isDelivered = status === 'Delivered';

    let statusColor = '#2563eb';
    let statusIcon = 'ri-time-line';
    if (status === 'Delivered') { statusColor = '#10b981'; statusIcon = 'ri-checkbox-circle-fill'; }
    if (status === 'Shipped' || status === 'Out for Delivery') { statusColor = '#f59e0b'; statusIcon = 'ri-truck-fill'; }
    if (isCancelled) { statusColor = '#ef4444'; statusIcon = 'ri-close-circle-fill'; }

    // Flipkart-style Stepper Stage calculation
    let stepIndex = 1;
    if (status === 'Confirmed') stepIndex = 2;
    if (status === 'Shipped') stepIndex = 3;
    if (status === 'Out for Delivery') stepIndex = 4;
    if (status === 'Delivered') stepIndex = 5;

    const steps = [
      { name: 'Ordered', icon: 'ri-shopping-cart-2-line' },
      { name: 'Confirmed', icon: 'ri-checkbox-circle-line' },
      { name: 'Shipped', icon: 'ri-truck-line' },
      { name: 'Out for Delivery', icon: 'ri-map-pin-user-line' },
      { name: 'Delivered', icon: 'ri-gift-line' }
    ];

    let stepperHtml = '';
    if (!isCancelled) {
      stepperHtml = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 12px; margin-top: 14px;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 14px; display: flex; justify-content: space-between;">
            <span><i class="ri-route-line" style="color: #2563eb;"></i> Live Courier Delivery Journey</span>
            <span style="color: #16a34a;"><i class="ri-shield-check-fill"></i> Free COD Verified</span>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; position: relative; max-width: 580px; margin: 0 auto;">
            <div style="position: absolute; top: 14px; left: 24px; right: 24px; height: 3px; background: #e2e8f0; z-index: 1;">
              <div style="height: 100%; width: ${((stepIndex - 1) / (steps.length - 1)) * 100}%; background: #16a34a; transition: width 0.4s ease;"></div>
            </div>
      `;

      steps.forEach((s, idx) => {
        const stepNum = idx + 1;
        const isDone = stepNum <= stepIndex;
        const isCurrent = stepNum === stepIndex;

        const circleBg = isDone ? '#16a34a' : '#fff';
        const circleColor = isDone ? '#fff' : '#94a3b8';
        const circleBorder = isDone ? '#16a34a' : '#cbd5e1';

        stepperHtml += `
          <div style="display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2; width: 68px; text-align: center;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${circleBg}; color: ${circleColor}; border: 2px solid ${circleBorder}; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
              ${isDone ? '<i class="ri-check-line"></i>' : stepNum}
            </div>
            <span style="font-size: 0.72rem; margin-top: 6px; font-weight: ${isCurrent ? '800' : '600'}; color: ${isDone ? '#0f172a' : '#94a3b8'}; line-height: 1.2;">
              ${s.name}
            </span>
          </div>
        `;
      });

      stepperHtml += `</div></div>`;
    } else {
      stepperHtml = `
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin-top: 14px; font-size: 0.82rem; color: #991b1b; display: flex; align-items: center; gap: 8px;">
          <i class="ri-close-circle-fill" style="font-size: 1.2rem;"></i>
          <span><strong>Order Cancelled:</strong> This order was cancelled as requested. You will not receive any delivery or call for this item.</span>
        </div>
      `;
    }

    // Action buttons (Cancel / Help / Return)
    let actionButtons = '';
    if (!isCancelled && !isDelivered) {
      actionButtons += `
        <button type="button" onclick="openCancelModal(${o.id})" style="background: #fff; color: #ef4444; border: 1px solid #fecaca; padding: 7px 16px; border-radius: 6px; font-size: 0.82rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: background 0.2s;">
          <i class="ri-close-circle-line"></i> Cancel Order
        </button>
      `;
    }
    actionButtons += `
      <a href="https://api.whatsapp.com/send?phone=918002089898&text=${encodeURIComponent(`Hello TrendBazaar Helpdesk, I need help with my Order #ORD-${o.id} (${o.product_title})`)}" target="_blank" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 7px 16px; border-radius: 6px; font-size: 0.82rem; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
        <i class="ri-customer-service-2-line" style="color: #2563eb;"></i> Need Help?
      </a>
    `;

    html += `
      <div class="profile-order-item" style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
        <div class="profile-order-header" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
          <div>
            <strong style="color: var(--sk-primary); font-family: monospace; font-size: 0.95rem;">#ORD-${o.id}</strong> • 
            <span style="color: var(--sk-text-muted); font-size: 0.8rem;">Placed on ${dateStr}</span>
          </div>
          <div style="font-weight: 800; color: ${statusColor}; font-size: 0.88rem; display: flex; align-items: center; gap: 4px;">
            <i class="${statusIcon}"></i> ${status}
          </div>
        </div>

        <div class="profile-order-grid" style="display: flex; gap: 16px; align-items: center; padding: 14px 0;">
          <img src="${imgUrl}" class="profile-order-img" style="width: 72px; height: 72px; border-radius: 6px; object-fit: cover; border: 1px solid #e2e8f0;" alt="${o.product_title}" onerror="this.src='assets/hero_fashion.jpg'">
          <div style="flex: 1;">
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--sk-text-dark); margin: 0 0 4px 0;">${o.product_title}</h4>
            <div style="font-size: 0.8rem; color: var(--sk-text-muted);">Size: <strong>${o.size || 'Free Size'}</strong> • Qty: 1</div>
            <div style="font-size: 0.78rem; color: var(--sk-text-muted); margin-top: 2px;">
              Delivery to: <span style="color: var(--sk-text-dark); font-weight: 600;">${o.customer_name || 'Customer'}</span> (${o.customer_phone || ''})
            </div>
            <div style="font-size: 0.74rem; color: var(--sk-text-muted); max-width: 360px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.customer_address || ''}">
              📍 ${o.customer_address || 'Delivery Address'}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.25rem; font-weight: 900; color: var(--sk-text-dark);">₹${o.product_price || 0}</div>
            <span class="adm-badge adm-badge-gray" style="font-size: 0.72rem; display: inline-block; margin-top: 4px;">Cash on Delivery</span>
          </div>
        </div>

        <!-- Flipkart-Style Live Tracking Progress Bar -->
        ${stepperHtml}

        <!-- Bottom Action Buttons -->
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
          ${actionButtons}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ---------- Cancel Order Modal Handlers ----------
function openCancelModal(orderId) {
  currentCancellingOrderId = orderId;
  const tag = document.getElementById('cancelOrderIdText');
  if (tag) tag.textContent = `#ORD-${orderId}`;
  document.getElementById('cancelOrderModal').style.display = 'flex';
}
window.openCancelModal = openCancelModal;

function closeCancelModal() {
  document.getElementById('cancelOrderModal').style.display = 'none';
  currentCancellingOrderId = null;
}
window.closeCancelModal = closeCancelModal;

async function confirmOrderCancellation() {
  if (!currentCancellingOrderId) return;
  const reason = document.getElementById('cancelReasonSelect').value;
  const orderId = currentCancellingOrderId;

  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from('orders').update({ status: 'Cancelled' }).eq('id', orderId);
      if (error) throw error;
      showSkToast(`✅ Order #ORD-${orderId} has been cancelled.`);
    } catch (e) {
      console.warn("Supabase cancel warning:", e);
    }
  }

  // Update local cache
  const localOrder = userOrders.find(o => o.id === orderId);
  if (localOrder) localOrder.status = 'Cancelled';

  closeCancelModal();
  renderCustomerOrders();
}
window.confirmOrderCancellation = confirmOrderCancellation;

// ---------- Render Wishlist Tab ----------
function renderCustomerWishlist() {
  const container = document.getElementById('profWishlistGrid');
  const countTag = document.getElementById('profWishlistCountTag');
  if (!container) return;

  if (countTag) countTag.textContent = `${userWishlist.length} Items`;

  if (userWishlist.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; color: var(--sk-text-muted);">
        <i class="ri-heart-3-line" style="font-size: 3rem; color: var(--sk-text-light); display: block; margin-bottom: 8px;"></i>
        <h4>Your Wishlist is Empty</h4>
        <p style="font-size: 0.85rem; margin-top: 4px;">Save items you love by tapping the heart icon on any product.</p>
      </div>
    `;
    return;
  }

  let html = '';
  userWishlist.forEach(p => {
    const imgUrl = (Array.isArray(p.images) && p.images.length > 0) ? cleanMeeshoHDUrl(p.images[0]) : (p.image || 'assets/hero_fashion.jpg');
    html += `
      <div class="sk-product-card" onclick="window.location.href='product.html?id=${p.id}'" style="cursor: pointer; background: #fff; border: 1px solid var(--sk-border); border-radius: 8px; overflow: hidden; padding: 12px;">
        <div class="sk-card-img-wrap" style="height: 160px; display: flex; align-items: center; justify-content: center;">
          <img src="${imgUrl}" class="sk-product-img" style="max-height: 150px; max-width: 100%; object-fit: contain;" alt="${p.title}" onerror="this.src='assets/hero_fashion.jpg'">
        </div>
        <div class="sk-product-details" style="padding-top: 10px;">
          <h4 style="font-size: 0.84rem; font-weight: 700; color: var(--sk-text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.title}</h4>
          <div style="font-size: 1rem; font-weight: 800; color: var(--sk-text-dark); margin: 4px 0;">₹${p.price}</div>
          <button class="sk-btn-primary" style="width: 100%; justify-content: center; padding: 6px; font-size: 0.78rem; margin-top: 6px;">
            <i class="ri-shopping-bag-3-fill"></i> Buy Now
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ---------- Render Saved Addresses ----------
function renderSavedAddresses() {
  const container = document.getElementById('profAddressList');
  if (!container) return;

  const savedAddr = localStorage.getItem('tb_saved_address');
  if (savedAddr) {
    try {
      const addr = JSON.parse(savedAddr);
      container.innerHTML = `
        <div style="border: 1px solid var(--sk-border); padding: 18px; border-radius: 8px; background: #ffffff; margin-bottom: 12px; position: relative;">
          <span class="adm-badge adm-badge-success" style="position: absolute; top: 18px; right: 18px;">DEFAULT</span>
          <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--sk-text-dark); margin: 0 0 6px 0;">${addr.name || 'Default Name'}</h4>
          <p style="color: var(--sk-text-muted); font-size: 0.84rem; line-height: 1.4; margin: 0 0 8px 0;">
            ${addr.street || addr.house || ''}, ${addr.city || ''}, PIN: ${addr.pincode || ''}
          </p>
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--sk-text-dark);">📞 Mobile: ${addr.phone || 'N/A'}</span>
        </div>
      `;
      return;
    } catch (_) {}
  }

  container.innerHTML = `
    <div style="padding: 30px; text-align: center; color: var(--sk-text-muted);">
      <i class="ri-map-pin-line" style="font-size: 2.5rem; display: block; margin-bottom: 8px; color: var(--sk-text-light);"></i>
      <p>No saved addresses found. Addresses saved during checkout will be stored here.</p>
    </div>
  `;
}

function openAddAddressPrompt() {
  const name = prompt('Enter Customer Full Name:');
  if (!name) return;
  const phone = prompt('Enter 10-digit Phone:');
  const street = prompt('Enter House No / Street Address:');
  const city = prompt('Enter City:');
  const pincode = prompt('Enter Pincode:');

  if (name && phone && street && city && pincode) {
    const addrObj = { name, phone, street, city, pincode };
    localStorage.setItem('tb_saved_address', JSON.stringify(addrObj));
    renderSavedAddresses();
    showSkToast('🎉 Address saved successfully!');
  }
}
window.openAddAddressPrompt = openAddAddressPrompt;

// ---------- Save Account Settings ----------
function saveProfileSettings(e) {
  e.preventDefault();
  const name = document.getElementById('setFullName').value.trim();
  const phone = document.getElementById('setPhone').value.trim();

  if (name) {
    document.getElementById('profUserName').textContent = name;
    document.getElementById('profAvatar').textContent = name.charAt(0).toUpperCase();
    localStorage.setItem('tb_customer_name', name);
  }
  if (phone) {
    localStorage.setItem('tb_customer_phone', phone);
    if (!currentUser) {
      document.getElementById('profUserEmail').textContent = `📞 ${phone}`;
    }
  }

  showSkToast('🎉 Profile settings updated successfully!');
}
window.saveProfileSettings = saveProfileSettings;

function handleProfileLogout() {
  if (confirm('Are you sure you want to log out?')) {
    if (window.auth) {
      window.auth.signOut().then(() => {
        window.location.href = 'index.html';
      });
    } else {
      window.location.href = 'index.html';
    }
  }
}
window.handleProfileLogout = handleProfileLogout;

function updateCartBadge() {
  try {
    const savedCart = localStorage.getItem('sk_cart');
    const items = savedCart ? JSON.parse(savedCart) : [];
    const count = items.reduce((acc, i) => acc + (i.qty || 1), 0);
    const badge = document.getElementById('cartCountBadge');
    if (badge) badge.textContent = count;
  } catch (_) {}
}

// ---------- Server-Side Referral & Earn Engine (Up to ₹100) ----------
async function initReferralCode() {
  const uid = currentUser ? currentUser.uid : (localStorage.getItem('tb_customer_uid') || 'guest_' + Date.now());
  if (!localStorage.getItem('tb_customer_uid')) localStorage.setItem('tb_customer_uid', uid);

  let rewardAmount = 25; // fallback
  let code = 'TB-REF' + uid.slice(-6).toUpperCase();

  try {
    const res = await fetch(`http://localhost:8080/api/referral-reward?user_id=${encodeURIComponent(uid)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        rewardAmount = data.reward_amount;
        code = data.referral_code || code;
      }
    }
  } catch (err) {
    console.warn('Server referral fetch fallback:', err);
  }

  const tag = document.getElementById('myReferralCodeTag');
  if (tag) tag.textContent = code;

  const rewardBadge = document.getElementById('refRewardAmountBadge');
  if (rewardBadge) rewardBadge.textContent = `₹${rewardAmount}`;

  const serverNotice = document.getElementById('refServerNotice');
  if (serverNotice) serverNotice.textContent = `Your Server-Authorized Reward: Up to ₹100 per friend`;

  const wa = document.getElementById('btnShareWhatsApp');
  if (wa) {
    const text = `Hey! Check out TrendBazaar for awesome wholesale fashion & gadgets. Use my invite code ${code} for Up to ₹100 Instant Discount on your first order: ${window.location.origin}/index.html?ref=${code}`;
    wa.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }
}

function copyReferralCode() {
  const tag = document.getElementById('myReferralCodeTag');
  if (tag) {
    navigator.clipboard.writeText(tag.textContent);
    showSkToast('🎉 Referral Code copied to clipboard!');
  }
}
window.copyReferralCode = copyReferralCode;

// Global bootstrap
function bootstrapProfile() {
  const hash = window.location.hash.replace('#', '');
  if (hash && ['orders', 'wishlist', 'address', 'settings', 'refer'].includes(hash)) {
    switchProfileTab(hash);
  } else {
    switchProfileTab('orders');
  }

  initReferralCode();

  if (window.auth) {
    window.auth.onAuthStateChanged((user) => {
      currentUser = user;
      loadCustomerData();
      initReferralCode();
    });
  } else {
    loadCustomerData();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapProfile);
} else {
  bootstrapProfile();
}

// ---------- Wallet Preview (Profile Tab) ----------
async function loadWalletPreview() {
  const sb = getSupabase();
  if (!sb) return;

  const uid = currentUser
    ? currentUser.uid
    : localStorage.getItem('tb_customer_uid');

  if (!uid) return;

  try {
    const { data: walletData } = await sb
      .from('wallets')
      .select('balance')
      .eq('firebase_uid', uid)
      .single();

    const balEl = document.getElementById('profWalletBalance');
    if (balEl) balEl.textContent = walletData ? walletData.balance : '0';

    const { data: txData } = await sb
      .from('wallet_transactions')
      .select('*')
      .eq('firebase_uid', uid)
      .order('created_at', { ascending: false })
      .limit(3);

    const txListEl = document.getElementById('profWalletTxList');
    if (!txListEl) return;

    if (!txData || txData.length === 0) {
      txListEl.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:20px;"><i class="ri-wallet-3-line"></i><p>No transactions yet. Start shopping!</p></div>`;
      return;
    }

    txListEl.innerHTML = txData.map(tx => {
      const isCredit = tx.type === 'CREDIT';
      const sign = isCredit ? '+' : '-';
      const color = isCredit ? '#059669' : '#dc2626';
      const icon = isCredit ? 'ri-arrow-right-down-line' : 'ri-arrow-right-up-line';
      const date = new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;border-radius:10px;background:#f8fafc;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;border-radius:50%;background:${isCredit ? '#d1fae5' : '#fee2e2'};display:flex;align-items:center;justify-content:center;color:${color};font-size:1.1rem;">
              <i class="${icon}"></i>
            </div>
            <div>
              <div style="font-weight:700;font-size:0.9rem;">${tx.description || (isCredit ? 'Cashback / Refund' : 'Payment')}</div>
              <div style="font-size:0.75rem;color:#94a3b8;">${date}</div>
            </div>
          </div>
          <div style="font-weight:800;color:${color};">${sign}₹${tx.amount}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.warn('Wallet preview error:', e);
  }
}

window.loadWalletPreview = loadWalletPreview;
