/* ----------------------------------------------------
   ShopKart - Customer Panel Application Engine (app.js)
   Complete Implementation of PRD Specifications
   ---------------------------------------------------- */

let skProducts = [];
let skWishlist = [];
let skCart = [];
let skOrders = [];

let activeCategory = 'All';
let activeSortOption = 'relevance';
let activeProductForModal = null;
let selectedSize = 'Free Size';

const DEFAULT_PRESET_ITEMS = [];

document.addEventListener('DOMContentLoaded', async () => {
  await applyDynamicSettings();
  await loadSkData();
  renderSkProducts();
  updateHeaderBadges();

  // Listen for Supabase Realtime (optional, can be added later)

  // Close search dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sk-search-box')) {
      const drop = document.getElementById('skSearchDropdown');
      if (drop) drop.classList.remove('active');
    }
  });
});

function cleanMeeshoHDUrl(url) {
  if (!url) return 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg';
  if (typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.startsWith('assets/') || !url.includes('meesho.com')) return url;
  let clean = url.split('?')[0];
  clean = clean.replace(/_\d+\.(jpg|webp|jpeg)/g, '_512.jpg').replace(/\/whwdt_\d+\./g, '/whwdt_512.');
  return clean;
}

async function loadSkData() {
  try {
    const sb = window.getSupabase ? window.getSupabase() : (window.supabaseClient || window.supabase);
    if (!sb) {
      console.warn("Supabase client not initialized yet.");
      return;
    }

    const { data: prods, error } = await sb.from('products').select('*').order('id', { ascending: false });
    
    if (prods && prods.length > 0) {
      skProducts = prods.map(p => ({
        ...p,
        id: String(p.id),
        title: p.title || 'Trending Product',
        category: p.category || 'General',
        sellingPrice: p.price || p.sellingPrice || 499,
        mrp: p.original_price || p.mrp || Math.round((p.price || 499) * 2.2),
        images: (Array.isArray(p.images) && p.images.length > 0) ? p.images : (p.image ? [p.image] : ['https://images.meesho.com/images/products/919864713/ysbzv_512.jpg']),
        sizes: (Array.isArray(p.sizes) && p.sizes.length > 0) ? p.sizes : ['Free Size', 'S', 'M', 'L', 'XL'],
        specs: p.specs || {},
        description: p.description || 'High quality trending product with cash on delivery and 7-day replacement.',
        rating: p.rating || 4.6,
        reviews: p.reviews || 120
      }));
    } else {
      skProducts = [...DEFAULT_PRESET_ITEMS];
    }

    if (currentUser) {
      const uid = currentUser.uid;
      const { data: wishes } = await sb.from('wishlists').select('product_id').eq('firebase_uid', uid);
      if (wishes) {
        skWishlist = skProducts.filter(p => wishes.some(w => String(w.product_id) === String(p.id)));
      }

      const { data: orders } = await sb.from('orders').select('*').eq('firebase_uid', uid).order('created_at', { ascending: false });
      if (orders) {
        skOrders = orders;
      }
    } else {
      skWishlist = [];
      skOrders = [];
    }

    try {
      const savedCart = localStorage.getItem('sk_cart');
      if (savedCart) skCart = JSON.parse(savedCart);
    } catch (_) { skCart = []; }
  } catch (err) {
    console.error("Supabase load error:", err);
  }
}

function renderSkProducts(filteredItems = null) {
  const grid = document.getElementById('skProductsGrid');
  if (!grid) return;

  grid.innerHTML = '';
  let items = filteredItems ? [...filteredItems] : [...skProducts];

  if (activeCategory !== 'All') {
    items = items.filter(p => p.category === activeCategory);
  }

  if (activeSortOption === 'price-low') {
    items.sort((a, b) => a.sellingPrice - b.sellingPrice);
  } else if (activeSortOption === 'price-high') {
    items.sort((a, b) => b.sellingPrice - a.sellingPrice);
  } else if (activeSortOption === 'rating') {
    items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  if (items.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--sk-text-muted);">
        <i class="ri-search-line" style="font-size: 2.5rem; display: block; margin-bottom: 10px; color: var(--sk-border);"></i>
        <h3>No products found in catalog.</h3>
      </div>
    `;
    return;
  }

  items.forEach(p => {
    const discountPct = Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100);
    const primaryImg = p.images && p.images.length > 0 ? cleanMeeshoHDUrl(p.images[0]) : 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg';
    const isWishlisted = skWishlist.some(w => String(w.id) === String(p.id));
    const photoCount = p.images ? p.images.length : 1;

    const card = document.createElement('div');
    card.className = 'sk-product-card';
    card.onclick = () => { window.location.href = `product.html?id=${p.id}`; };

    card.innerHTML = `
      <div class="sk-product-img-wrapper">
        <img src="${primaryImg}" alt="${p.title}" class="sk-product-img" onerror="this.onerror=null; this.src='assets/hero_fashion.jpg';">
        <button class="sk-wishlist-toggle ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation(); toggleSkWishlist('${p.id}')">
          <i class="${isWishlisted ? 'ri-heart-3-fill' : 'ri-heart-3-line'}"></i>
        </button>
        <span class="sk-badge-discount">${discountPct}% OFF</span>
        <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.8); color: #34d399; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
          📸 ${photoCount} Photos
        </span>
      </div>

      <div class="sk-product-content">
        <h3 class="sk-product-title" title="${p.title}">${p.title}</h3>
        
        <div class="sk-rating-row">
          <div class="sk-rating-chip" style="background: #388e3c;">${p.rating || 4.5} <i class="ri-star-fill"></i></div>
          <span style="color: var(--sk-text-muted); font-size: 0.78rem;">(${p.reviews ? p.reviews.toLocaleString() : '218'})</span>
        </div>

        <div class="sk-price-row">
          <span class="sk-current-price">₹${p.sellingPrice}</span>
          <span class="sk-mrp-price">₹${p.mrp}</span>
        </div>

        <div class="sk-card-actions">
          <button class="sk-btn-view" onclick="event.stopPropagation(); window.location.href='product.html?id=${p.id}'">View Product</button>
          <button class="sk-btn-buy" onclick="event.stopPropagation(); directBuyNow('${p.id}')">Buy Now</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function directBuyNow(productId) {
  const p = skProducts.find(item => String(item.id) === String(productId));
  if (!p) {
    window.location.href = `product.html?id=${productId}`;
    return;
  }
  const item = {
    id: String(p.id),
    title: p.title,
    sellingPrice: p.sellingPrice || p.price || 499,
    mrp: p.mrp || p.original_price || Math.round((p.price || 499) * 2.2),
    images: p.images || [],
    selectedSize: (p.sizes && p.sizes[0]) || 'Free Size',
    qty: 1
  };
  localStorage.setItem('sk_cart', JSON.stringify([item]));

  const user = window.auth ? window.auth.currentUser : null;
  if (!user) {
    showToast('🔒 Please Login or Create an Account to Buy!');
    sessionStorage.setItem('auth_redirect', 'cart.html');
    setTimeout(() => {
      window.location.href = `login.html?redirect=${encodeURIComponent('cart.html')}&reason=buy`;
    }, 1000);
    return;
  }

  window.location.href = 'cart.html';
}
window.directBuyNow = directBuyNow;

function openSkProductPage(id) {
  window.location.href = `product.html?id=${id}`;
}

function openSkDetailModal(id) {
  window.location.href = `product.html?id=${id}`;
}

function filterSkCategory(catName) {
  activeCategory = catName;
  document.querySelectorAll('.sk-cat-pill').forEach(pill => {
    if (pill.textContent.trim() === catName || (catName === 'All' && pill.textContent.includes('All'))) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
  renderSkProducts();
}

function handleSkSortChange() {
  activeSortOption = document.getElementById('skSortSelect').value;
  renderSkProducts();
}

function handleSkSearchInput() {
  const query = document.getElementById('skSearchInput').value.toLowerCase().trim();
  const drop = document.getElementById('skSearchDropdown');
  if (!drop) return;

  if (!query) {
    drop.classList.remove('active');
    renderSkProducts();
    return;
  }

  const matches = skProducts.filter(p => p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
  drop.innerHTML = '';

  if (matches.length > 0) {
    matches.slice(0, 5).forEach(m => {
      const item = document.createElement('div');
      item.className = 'sk-search-item';
      item.innerHTML = `<i class="ri-search-line"></i> <span>${m.title}</span>`;
      item.onclick = () => {
        document.getElementById('skSearchInput').value = m.title;
        drop.classList.remove('active');
        openSkDetailModal(m.id);
      };
      drop.appendChild(item);
    });
    drop.classList.add('active');
  } else {
    drop.classList.remove('active');
  }

  renderSkProducts(matches);
}

async function toggleSkWishlist(id) {
  if (!currentUser) {
    showSkToast('Please login to save items to wishlist!');
    window.location.href = 'login.html';
    return;
  }

  const p = skProducts.find(item => String(item.id) === String(id));
  if (!p) return;

  const idx = skWishlist.findIndex(w => String(w.id) === String(id));
  
  if (idx >= 0) {
    skWishlist.splice(idx, 1);
    await supabase.from('wishlists').delete().eq('firebase_uid', currentUser.uid).eq('product_id', p.id);
    showSkToast(`Removed "${p.title.slice(0, 18)}..." from Wishlist`);
  } else {
    skWishlist.unshift(p);
    await supabase.from('wishlists').insert([{ firebase_uid: currentUser.uid, product_id: p.id }]);
    showSkToast(`❤️ Saved "${p.title.slice(0, 18)}..." to Wishlist!`);
  }

  updateHeaderBadges();
  renderSkProducts();
}

function openWishlistModal() {
  renderWishlistItems();
  openModal('skWishlistModal');
}

function renderWishlistItems() {
  const container = document.getElementById('wishlistItemsList');
  if (!container) return;

  container.innerHTML = '';
  if (skWishlist.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--sk-text-muted); padding: 30px;">Your wishlist is empty.</p>`;
    return;
  }

  skWishlist.forEach((item, idx) => {
    const itemImg = item.images && item.images.length > 0 ? cleanMeeshoHDUrl(item.images[0]) : 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg';
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '14px';
    div.style.alignItems = 'center';
    div.style.background = 'var(--sk-bg-main)';
    div.style.padding = '12px';
    div.style.borderRadius = '10px';
    div.style.marginBottom = '10px';

    div.innerHTML = `
      <img src="${itemImg}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
      <div style="flex-grow: 1;">
        <h4 style="font-size: 0.9rem; color: var(--sk-text-dark); font-weight: 700;">${item.title}</h4>
        <span style="font-weight: 800; color: var(--sk-primary); font-size: 0.95rem;">₹${item.sellingPrice}</span>
      </div>
      <button onclick="openSkDetailModal('${item.id}'); closeModal('skWishlistModal');" class="sk-btn-primary" style="padding: 6px 14px; font-size: 0.78rem;">View Details</button>
      <button onclick="toggleSkWishlist('${item.id}'); renderWishlistItems();" style="background: none; border: none; color: var(--sk-danger); cursor: pointer; font-size: 1.1rem;">
        <i class="ri-delete-bin-line"></i>
      </button>
    `;
    container.appendChild(div);
  });
}

function checkSkPincode() {
  const pin = document.getElementById('detailPincodeInput').value.trim();
  const msg = document.getElementById('detailPinMsg');
  if (pin.length === 6 && !isNaN(pin)) {
    msg.innerHTML = `<i class="ri-checkbox-circle-fill"></i> Express Delivery Available to <strong>${pin}</strong> (Delivered in 2-4 Days with COD)`;
  } else {
    msg.innerHTML = `<span style="color: var(--sk-danger);">Please enter a valid 6-digit Pincode.</span>`;
  }
}

function buyNowDirect(id) {
  openSkDetailModal(id);
  setTimeout(buyNowFromModal, 300);
}

function addToCartFromModal() {
  if (!activeProductForModal) return;
  
  const itemToAdd = { ...activeProductForModal, selectedSize: selectedSize };
  const existing = skCart.find(i => i.id === itemToAdd.id && i.selectedSize === selectedSize);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    skCart.push({ ...itemToAdd, qty: 1 });
  }

  localStorage.setItem('sk_cart', JSON.stringify(skCart));
  updateHeaderBadges();
  closeModal('skDetailModal');
  showSkToast(`🛒 Added "${activeProductForModal.title.slice(0, 18)}..." to Cart! <a href="cart.html" style="color:var(--sk-primary); margin-left:8px; font-weight:800; text-decoration:underline;">View Cart</a>`);
}

function buyNowFromModal() {
  if (!activeProductForModal) return;
  const itemToAdd = { ...activeProductForModal, selectedSize: selectedSize };
  
  // Check if item already exists in cart or append
  const existing = skCart.find(i => i.id === itemToAdd.id && i.selectedSize === selectedSize);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    skCart.push({ ...itemToAdd, qty: 1 });
  }

  localStorage.setItem('sk_cart', JSON.stringify(skCart));
  updateHeaderBadges();
  closeModal('skDetailModal');
  window.location.href = 'cart.html';
}

function openCartModal() {
  window.location.href = 'cart.html';
}

function renderCartItems() {
  const container = document.getElementById('cartItemsList');
  const totalPayableEl = document.getElementById('skCartTotalPayable');
  if (!container) return;

  container.innerHTML = '';
  if (skCart.length === 0) {
    container.innerHTML = `<p style="color: var(--sk-text-muted); text-align: center; padding: 20px;">Your shopping cart is empty.</p>`;
    totalPayableEl.textContent = '₹0';
    return;
  }

  let total = 0;
  skCart.forEach((item, idx) => {
    const itemPrice = item.sellingPrice * (item.qty || 1);
    total += itemPrice;
    const itemImg = item.images && item.images.length > 0 ? cleanMeeshoHDUrl(item.images[0]) : 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg';

    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '12px';
    div.style.alignItems = 'center';
    div.style.background = 'var(--sk-bg-main)';
    div.style.padding = '10px';
    div.style.borderRadius = '8px';
    div.style.marginBottom = '8px';

    div.innerHTML = `
      <img src="${itemImg}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover;">
      <div style="flex-grow: 1;">
        <h4 style="font-size: 0.85rem; color: var(--sk-text-dark); font-weight: 700;">${item.title}</h4>
        <span style="font-weight: 800; color: var(--sk-primary); font-size: 0.9rem;">₹${item.sellingPrice}</span>
        ${item.selectedSize ? `<br><small style="color: var(--sk-text-muted);">Size: ${item.selectedSize}</small>` : ''}
      </div>
      <div style="display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid var(--sk-border); padding: 2px 6px; border-radius: 4px;">
        <button onclick="updateCartQty(${idx}, -1)" style="border: none; background: none; cursor: pointer; font-weight: 800;">-</button>
        <span style="font-size: 0.85rem; font-weight: 800;">${item.qty || 1}</span>
        <button onclick="updateCartQty(${idx}, 1)" style="border: none; background: none; cursor: pointer; font-weight: 800;">+</button>
      </div>
      <button onclick="removeCartItem(${idx})" style="background: none; border: none; color: var(--sk-danger); font-size: 1.1rem; cursor: pointer;">
        <i class="ri-delete-bin-line"></i>
      </button>
    `;
    container.appendChild(div);
  });

  totalPayableEl.textContent = '₹' + total;
}

function updateCartQty(idx, change) {
  if (skCart[idx]) {
    skCart[idx].qty = (skCart[idx].qty || 1) + change;
    if (skCart[idx].qty <= 0) skCart.splice(idx, 1);
    updateHeaderBadges();
    renderCartItems();
  }
}

function removeCartItem(idx) {
  skCart.splice(idx, 1);
  updateHeaderBadges();
  renderCartItems();
}

function updateHeaderBadges() {
  document.getElementById('cartCountBadge').textContent = skCart.reduce((acc, i) => acc + (i.qty || 1), 0);
  document.getElementById('wishlistCountBadge').textContent = skWishlist.length;
}

async function submitSkOrder(event) {
  event.preventDefault();
  if (skCart.length === 0) {
    showSkToast('❌ Your cart is empty!');
    return;
  }
  if (!currentUser) {
    showSkToast('Please login to place an order!');
    window.location.href = 'login.html';
    return;
  }

  const name = document.getElementById('skCustName').value.trim();
  const phone = document.getElementById('skCustPhone').value.trim();
  const address = document.getElementById('skCustAddress').value.trim();
  const city = document.getElementById('skCustCity').value.trim();
  const pincode = document.getElementById('skCustPin').value.trim();

  const item = skCart[0]; // Currently handling 1 item for simplicity

  const newOrder = {
    firebase_uid: currentUser.uid,
    product_id: isNaN(item.id) ? null : item.id, // Handle preset text IDs vs numeric
    product_title: item.title,
    product_price: item.sellingPrice,
    product_image: item.images && item.images.length > 0 ? item.images[0] : null,
    size: item.selectedSize || (item.sizes ? item.sizes[0] : 'Free Size'),
    status: 'Confirmed (COD)',
    customer_name: name,
    customer_phone: phone,
    customer_address: address + ', ' + city + ' - ' + pincode
  };

  const { data, error } = await supabase.from('orders').insert([newOrder]).select();
  
  if (error) {
    showSkToast('❌ Failed to place order. Try again.');
    console.error(error);
    return;
  }

  // Update UI instantly
  if (data && data.length > 0) {
    skOrders.unshift(data[0]);
  }

  skCart = [];
  updateHeaderBadges();
  closeModal('skCartModal');

  const generatedId = data && data.length > 0 ? data[0].id : 'SYS-NEW';
  showSkToast(`🎉 Order Placed Successfully! Order ID: ${generatedId}`);
  alert(`🎉 Thank you ${name}!\n\nYour Cash on Delivery Order #${generatedId} for "${item.title}" (Size: ${newOrder.size}) has been confirmed.\n\nTotal COD Amount: ₹${item.sellingPrice}\nDelivery Address: ${newOrder.customer_address}`);
}

function openOrdersModal() {
  window.location.href = 'profile.html';
}

function renderOrdersItems() {
  const container = document.getElementById('ordersItemsList');
  if (!container) return;

  container.innerHTML = '';
  if (skOrders.length === 0) {
    container.innerHTML = `<p style="color: var(--sk-text-muted); text-align: center; padding: 30px;">No active orders placed yet.</p>`;
    return;
  }

  skOrders.forEach(o => {
    const card = document.createElement('div');
    card.style.background = 'var(--sk-bg-main)';
    card.style.border = '1px solid var(--sk-border)';
    card.style.borderRadius = '12px';
    card.style.padding = '16px';
    card.style.marginBottom = '16px';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--sk-border); padding-bottom: 8px;">
        <div>
          <strong style="color: var(--sk-primary); font-size: 0.95rem;">Order #${o.id || o.orderId}</strong>
          <span style="font-size: 0.78rem; color: var(--sk-text-muted); margin-left: 8px;">${o.created_at ? o.created_at.split('T')[0] : o.date}</span>
        </div>
        <span style="background: rgba(16, 185, 129, 0.15); color: var(--sk-success); padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 800;">
          ${o.status}
        </span>
      </div>

      <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--sk-text-dark); margin-bottom: 6px;">${o.product_title || o.productTitle}</h4>
      <div style="font-size: 0.82rem; color: var(--sk-text-muted); margin-bottom: 12px;">
        <span>Size: <strong>${o.size}</strong></span> | 
        <span>COD Amount: <strong style="color: var(--sk-primary);">₹${o.product_price || o.sellingPrice}</strong></span> | 
        <span>Recipient: ${o.customer_name || o.custName}</span>
      </div>

      <!-- INTERACTIVE ORDER TIMELINE TRACKER -->
      <div class="sk-timeline">
        <div class="sk-timeline-step active">
          <div class="sk-timeline-icon"><i class="ri-checkbox-circle-fill"></i></div>
          <span>Placed</span>
        </div>
        <div class="sk-timeline-step active">
          <div class="sk-timeline-icon"><i class="ri-shield-check-fill"></i></div>
          <span>Confirmed</span>
        </div>
        <div class="sk-timeline-step active">
          <div class="sk-timeline-icon"><i class="ri-box-3-fill"></i></div>
          <span>Packed</span>
        </div>
        <div class="sk-timeline-step">
          <div class="sk-timeline-icon"><i class="ri-truck-fill"></i></div>
          <span>Shipped</span>
        </div>
        <div class="sk-timeline-step">
          <div class="sk-timeline-icon"><i class="ri-map-pin-user-fill"></i></div>
          <span>Delivered</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function showSkToast(msg) {
  const container = document.getElementById('skToastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'sk-toast';
  toast.innerHTML = `<i class="ri-information-fill" style="color: var(--sk-primary);"></i> ${msg}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- Firebase Auth Logic ---
let currentUser = null;

function handleAuthClick() {
  if (currentUser) {
    auth.signOut().then(() => {
      showSkToast('Logged out successfully');
    }).catch((error) => {
      showSkToast('Error logging out: ' + error.message);
    });
  } else {
    window.location.href = 'login.html';
  }
}

document.addEventListener('authStateChanged', async (e) => {
  currentUser = e.detail.user;
  const authBtnSpan = document.querySelector('#headerAuthBtn span');
  const authBtnIcon = document.querySelector('#headerAuthBtn i');
  
  if (currentUser) {
    authBtnSpan.textContent = 'Logout';
    authBtnIcon.className = 'ri-logout-box-r-line';
  } else {
    authBtnSpan.textContent = 'Login';
    authBtnIcon.className = 'ri-user-smile-line';
  }
  
  // Reload data to get user's wishlist and orders
  await loadSkData();
  renderSkProducts();
  updateHeaderBadges();
});

// ---------- Dynamic Settings (Master Admin Control) ----------
async function applyDynamicSettings() {
  try {
    const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') {
      console.warn('Could not load site settings:', error);
      return;
    }
    if (data) {
      if (data.homepage_layout) {
        try {
          const layoutArray = JSON.parse(data.homepage_layout);
          renderDynamicHomepage(layoutArray);
        } catch (e) {
          console.error("Error parsing homepage_layout", e);
        }
      }
      if (data.primary_color) {
        document.documentElement.style.setProperty('--sk-primary', data.primary_color);
      }
      if (data.header_bg_color) {
        document.documentElement.style.setProperty('--sk-header-bg', data.header_bg_color);
      }
      if (data.banner_image_url) {
        try {
          const slides = JSON.parse(data.banner_image_url);
          if (Array.isArray(slides)) {
            const track = document.getElementById('heroTrack');
            const dotsContainer = document.getElementById('heroDots');
            if (track && dotsContainer) {
              track.innerHTML = '';
              dotsContainer.innerHTML = '';
              slides.forEach((slide, idx) => {
                const isVideo = slide.type === 'video' || slide.url.endsWith('.mp4');
                const mediaHtml = isVideo 
                  ? `<video src="${slide.url}" class="sk-hero-bg" autoplay muted loop playsinline></video>`
                  : `<img src="${slide.url}" class="sk-hero-bg" onerror="this.src='assets/hero_fashion.jpg'">`;
                
                track.innerHTML += `
                  <div class="sk-hero-slide">
                    <div class="sk-hero-card">
                      ${mediaHtml}
                      <div class="sk-hero-content">
                        <span class="sk-hero-tag"><i class="ri-fire-fill"></i> EXCLUSIVE</span>
                        <h1 class="sk-hero-title">${slide.title || 'Grand Shopping Festival'}</h1>
                        <p class="sk-hero-subtitle">${slide.subtitle || 'Up to 80% OFF on selected items.'}</p>
                        <button class="sk-btn-primary" onclick="scrollToSection('dealsSection')">Shop Now <i class="ri-arrow-right-line"></i></button>
                      </div>
                    </div>
                  </div>
                `;
                dotsContainer.innerHTML += `<span class="dot ${idx === 0 ? 'active' : ''}" onclick="jumpCarousel(${idx})"></span>`;
              });
              currentCarouselIndex = 0;
            }
          }
        } catch (e) {
          // fallback to single image
          const banners = document.querySelectorAll('.sk-banner-img');
          banners.forEach(b => b.src = data.banner_image_url);
        }
      }
      if (data.footer_text) {
        const footerCopy = document.querySelector('.sk-footer-copy');
        if (footerCopy) footerCopy.textContent = data.footer_text;
      }
    }
  } catch (err) {
    console.error('applyDynamicSettings error:', err);
  }
}

/* =================================================================
   HERO CAROUSEL LOGIC
   ================================================================= */
let currentCarouselIndex = 0;
let carouselInterval = null;

function updateCarousel() {
  const track = document.getElementById('heroTrack');
  const dots = document.querySelectorAll('.sk-carousel-dots .dot');
  if (!track || dots.length === 0) return;
  
  track.style.transform = `translateX(-${currentCarouselIndex * 100}%)`;
  
  dots.forEach((dot, index) => {
    if (index === currentCarouselIndex) dot.classList.add('active');
    else dot.classList.remove('active');
  });
}

function moveCarousel(direction) {
  const totalSlides = document.querySelectorAll('.sk-hero-slide').length;
  if (totalSlides === 0) return;
  currentCarouselIndex = (currentCarouselIndex + direction + totalSlides) % totalSlides;
  updateCarousel();
  resetCarouselTimer();
}

window.moveCarousel = moveCarousel;

function jumpCarousel(index) {
  currentCarouselIndex = index;
  updateCarousel();
  resetCarouselTimer();
}

window.jumpCarousel = jumpCarousel;

function startCarouselTimer() {
  carouselInterval = setInterval(() => {
    moveCarousel(1);
  }, 5000);
}

function resetCarouselTimer() {
  clearInterval(carouselInterval);
  startCarouselTimer();
}

document.addEventListener('DOMContentLoaded', () => {
  startCarouselTimer();
});

/* =================================================================
   DYNAMIC HOMEPAGE RENDERER (WYSIWYG)
   ================================================================= */
function renderDynamicHomepage(layoutArray) {
  const container = document.getElementById('dynamicStorefrontContainer');
  if (!container) return;

  container.innerHTML = '';
  if (!Array.isArray(layoutArray) || layoutArray.length === 0) {
    return;
  }

  layoutArray.forEach((section, index) => {
    const secDiv = document.createElement('div');
    
    if (section.type === 'hero') {
      secDiv.innerHTML = `
        <section class="sk-hero-section">
          <div class="sk-carousel-container">
            <div class="sk-carousel-track" style="transform: translateX(0%);">
              <div class="sk-hero-slide">
                <div class="sk-hero-card">
                  <img src="assets/hero_fashion.jpg" class="sk-hero-bg">
                  <div class="sk-hero-content">
                    <span class="sk-hero-tag"><i class="ri-fire-fill"></i> EXCLUSIVE</span>
                    <h1 class="sk-hero-title">${section.title || 'Grand Shopping Festival'}</h1>
                    <button class="sk-btn-primary">Shop Now <i class="ri-arrow-right-line"></i></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;
    } else if (section.type === 'circle_categories' || section.type === 'square_categories') {
      const isCircle = section.type === 'circle_categories';
      const itemsHtml = (section.items || []).map(item => `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; min-width: 80px;" onclick="filterSkCategory('${item.label}')">
          <div style="width: 80px; height: 80px; border-radius: ${isCircle ? '50%' : '12px'}; overflow: hidden; border: 2px solid var(--sk-border); background: #f8fafc;">
            <img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--sk-text-dark); text-align: center;">${item.label}</span>
        </div>
      `).join('');
      
      secDiv.innerHTML = `
        <section style="padding: 20px;">
          <div style="display: flex; gap: 20px; overflow-x: auto; padding-bottom: 10px;" class="hide-scrollbar">
            ${itemsHtml}
          </div>
        </section>
      `;
    } else if (section.type === 'deals') {
      secDiv.innerHTML = `
        <section class="sk-section">
          <div class="sk-section-header">
            <div class="sk-section-title">
              <span>${section.title || 'Deals of the Day'}</span>
              <div class="sk-timer-chip"><i class="ri-timer-flash-fill"></i> Ends soon</div>
            </div>
          </div>
          <div class="sk-products-grid" id="dynamicDealsGrid-${index}">
            <!-- Will be populated by renderSkProducts dynamically if needed, or we just render all products here for now -->
          </div>
        </section>
      `;
      // Render some products into this specific grid
      setTimeout(() => {
        const grid = document.getElementById(`dynamicDealsGrid-${index}`);
        if(grid) {
          const originalGrid = document.getElementById('skProductsGrid');
          if(originalGrid && originalGrid !== grid) {
             grid.innerHTML = originalGrid.innerHTML;
          } else {
             // temporarily render all if skProductsGrid doesn't exist
             const oldId = document.getElementById('skProductsGrid');
             grid.id = 'skProductsGrid'; 
             renderSkProducts();
             grid.id = `dynamicDealsGrid-${index}`;
          }
        }
      }, 500);
    } else if (section.type === 'grid') {
      secDiv.innerHTML = `
        <section class="sk-section">
          <div class="sk-section-header">
            <div class="sk-section-title">
              <span>${section.title || 'Trending Products'}</span>
            </div>
          </div>
          <div class="sk-products-grid" id="dynamicGrid-${index}"></div>
        </section>
      `;
      setTimeout(() => {
        const grid = document.getElementById(`dynamicGrid-${index}`);
        if(grid) {
          const oldId = document.getElementById('skProductsGrid');
          if(oldId) oldId.id = 'skProductsGrid_disabled';
          grid.id = 'skProductsGrid';
          renderSkProducts();
        }
      }, 500);
    } else if (section.type === 'brands_marquee') {
      const itemsHtml = (section.items || []).map(item => `
        <div style="padding: 10px 30px;">
          <img src="${item.image}" style="height: 40px; object-fit: contain;">
        </div>
      `).join('');
      
      secDiv.innerHTML = `
        <section style="padding: 20px 0; background: #fff; border-top: 1px solid var(--sk-border); border-bottom: 1px solid var(--sk-border); overflow: hidden;">
          <div style="display: flex; width: max-content; animation: marquee 20s linear infinite;">
            ${itemsHtml}${itemsHtml}${itemsHtml}
          </div>
        </section>
      `;
    }

    container.appendChild(secDiv);
  });
}

// Live Preview Listener
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'LIVE_PREVIEW_UPDATE') {
    renderDynamicHomepage(event.data.layout);
  }
});