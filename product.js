// product.js - 100% Dynamic Product Details Page Engine

let currentProduct = null;
let selectedProductSize = 'Free Size';

function getSbClient() {
  if (window.getSupabase && typeof window.getSupabase === 'function') {
    const c = window.getSupabase();
    if (c) return c;
  }
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;
  if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    window.supabaseClient = supabase.createClient(
      'https://qixszgjbbxdfzjouuwfx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeHN6Z2piYnhkZnpqb3V1d2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTA2MzYsImV4cCI6MjEwMzk4NjYzNn0.pzXkXmWx29JHA4V2l5IJHA11hu2NJTEisNMsJa-pCbQ'
    );
    window.supabase = window.supabaseClient;
    return window.supabaseClient;
  }
  return null;
}

function cleanPhotoUrl(url) {
  if (!url || typeof url !== 'string') return 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg';
  if (url.startsWith('data:') || url.startsWith('assets/')) return url;
  let clean = url.split('?')[0];
  clean = clean.replace(/_\d+\.(jpg|webp|jpeg)/g, '_512.jpg').replace(/\/whwdt_\d+\./g, '/whwdt_512.');
  return clean;
}

// ----------------------------------------------------
// INITIALIZE PDP ENGINE
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  updateCartBadgeHeader();
  
  const params = new URLSearchParams(window.location.search);
  const targetId = params.get('id');

  await loadAndRenderProduct(targetId);
});

async function loadAndRenderProduct(id) {
  const sb = getSbClient();
  let product = null;

  if (sb) {
    try {
      if (id) {
        const { data, error } = await sb.from('products').select('*').eq('id', id).maybeSingle();
        if (data) product = data;
      }
      
      // Fallback: If no ID or specific item not found, load the latest added product
      if (!product) {
        const { data: latestList } = await sb.from('products').select('*').order('id', { ascending: false }).limit(1);
        if (latestList && latestList.length > 0) product = latestList[0];
      }
    } catch (e) {
      console.error('Supabase PDP fetch error:', e);
    }
  }

  // If still null, create safe fallback
  if (!product) {
    product = {
      id: 1,
      title: 'Trendy Ethnic Designer Wear Saree / Kurti Set',
      category: 'Ethnic Wear',
      price: 499,
      original_price: 1099,
      images: ['https://images.meesho.com/images/products/919864713/ysbzv_512.jpg'],
      sizes: ['Free Size', 'S', 'M', 'L', 'XL'],
      specs: {
        'Fabric / Material': 'Premium Blended Fabric',
        'Pattern / Style': 'Designer Embroidery Work',
        'Warranty': '7 Days Instant Replacement / Refund'
      },
      description: 'High quality trending designer wear with cash on delivery and free express shipping.',
      rating: 4.6,
      reviews: 120
    };
  }

  // Normalize data object
  currentProduct = {
    id: String(product.id),
    title: product.title || 'Trending Product',
    category: product.category || 'General',
    sellingPrice: product.price || product.sellingPrice || 499,
    mrp: product.original_price || product.mrp || Math.round((product.price || 499) * 2.2),
    images: (Array.isArray(product.images) && product.images.length > 0) ? product.images : (product.image ? [product.image] : ['https://images.meesho.com/images/products/919864713/ysbzv_512.jpg']),
    sizes: (Array.isArray(product.sizes) && product.sizes.length > 0) ? product.sizes : ['Free Size', 'S', 'M', 'L', 'XL'],
    specs: product.specs || {
      'Fabric / Material': product.fabric || 'Premium Blended Fabric',
      'Pattern / Style': product.pattern || 'Classic Designer Work',
      'Return Policy': '7 Days Easy Replacement'
    },
    description: product.description || 'High quality trending product with cash on delivery and 7-day easy replacement.',
    rating: product.rating || 4.6,
    reviews: product.reviews || 120
  };

  renderProductDOM(currentProduct);
  loadSuggestedProducts(currentProduct.id, currentProduct.category);
}

// ----------------------------------------------------
// RENDER DYNAMIC DOM
// ----------------------------------------------------
function renderProductDOM(p) {
  document.title = `${p.title} — TrendBazaar`;

  // Breadcrumbs
  document.getElementById('dynBreadCategory').textContent = p.category;
  document.getElementById('dynBreadTitle').textContent = p.title.length > 35 ? p.title.slice(0, 35) + '...' : p.title;

  // Title, Ratings, Reviews
  document.getElementById('dynTitle').textContent = p.title;
  document.getElementById('dynRating').innerHTML = `${p.rating || 4.6} <i class="ri-star-fill"></i>`;
  document.getElementById('dynReviews').textContent = `${(p.reviews || 120).toLocaleString()} Verified Ratings & Reviews`;

  // Pricing & Discounts
  const discountPct = Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100);
  document.getElementById('dynSellingPrice').textContent = `₹${p.sellingPrice.toLocaleString()}`;
  document.getElementById('dynMrpPrice').textContent = `₹${p.mrp.toLocaleString()}`;
  document.getElementById('dynDiscountTag').textContent = `${discountPct}% off`;

  // Photos & High-Res Gallery
  const allPhotos = p.images.map(cleanPhotoUrl);
  const mainImgEl = document.getElementById('dynMainImg');
  mainImgEl.src = allPhotos[0];
  mainImgEl.onerror = function() { this.src = 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg'; };

  const counterTag = document.getElementById('dynPhotoCounter');
  if (counterTag) counterTag.textContent = `📸 Photo 1 of ${allPhotos.length}`;

  const countHeader = document.getElementById('dynGalleryCountTag');
  if (countHeader) countHeader.textContent = `${allPhotos.length} Photos`;

  const galleryStrip = document.getElementById('dynGalleryStrip');
  if (galleryStrip) {
    galleryStrip.innerHTML = '';
    allPhotos.forEach((photoUrl, idx) => {
      const thumb = document.createElement('img');
      thumb.src = photoUrl;
      thumb.className = `pdp-thumb-item ${idx === 0 ? 'active' : ''}`;
      thumb.alt = `Photo ${idx + 1}`;
      thumb.onerror = function() { this.src = 'assets/hero_fashion.jpg'; };

      thumb.onclick = () => {
        mainImgEl.src = photoUrl;
        if (counterTag) counterTag.textContent = `📸 Photo ${idx + 1} of ${allPhotos.length}`;
        Array.from(galleryStrip.children).forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      };

      galleryStrip.appendChild(thumb);
    });
  }

  // Sizes Selector
  const sizesContainer = document.getElementById('dynSizesContainer');
  if (sizesContainer) {
    sizesContainer.innerHTML = '';
    selectedProductSize = p.sizes[0] || 'Free Size';

    p.sizes.forEach((sz, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `size-chip-btn ${idx === 0 ? 'active' : ''}`;
      btn.textContent = sz;

      btn.onclick = () => {
        selectedProductSize = sz;
        Array.from(sizesContainer.children).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };

      sizesContainer.appendChild(btn);
    });
  }

  // Dynamic Specs Table
  const specTable = document.getElementById('dynSpecTable');
  if (specTable) {
    specTable.innerHTML = '';
    Object.entries(p.specs).forEach(([k, v]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${k}</td><td style="font-weight: 700; color: #0f172a;">${v}</td>`;
      specTable.appendChild(tr);
    });
  }

  // Description
  document.getElementById('dynDescription').textContent = p.description;

  // Video
  const videoContainer = document.getElementById('dynVideoContainer');
  if (videoContainer) {
    if (p.video_url && (p.video_url.includes('youtube.com') || p.video_url.includes('youtu.be'))) {
      let videoId = '';
      if (p.video_url.includes('v=')) {
        videoId = p.video_url.split('v=')[1].split('&')[0];
      } else if (p.video_url.includes('youtu.be/')) {
        videoId = p.video_url.split('youtu.be/')[1].split('?')[0];
      }
      if (videoId) {
        videoContainer.style.display = 'block';
        videoContainer.innerHTML = `
          <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--sk-text-dark); margin-bottom: 10px; border-bottom: 1px solid var(--sk-border); padding-bottom: 8px;">
            Product Video Review
          </h3>
          <iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px;"></iframe>
        `;
      }
    } else {
      videoContainer.style.display = 'none';
      videoContainer.innerHTML = '';
    }
  }
}

// ----------------------------------------------------
// SUGGESTED PRODUCTS LOADER
// ----------------------------------------------------
async function loadSuggestedProducts(excludeId, category) {
  const grid = document.getElementById('dynSuggestedGrid');
  if (!grid) return;

  const sb = getSbClient();
  let prods = [];
  if (sb) {
    try {
      const { data } = await sb.from('products').select('*').neq('id', excludeId).limit(4);
      if (data) prods = data;
    } catch (_) {}
  }

  grid.innerHTML = '';
  if (prods.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1 / -1; color: var(--sk-text-muted); font-size: 0.85rem;">More products coming soon to this collection!</p>`;
    return;
  }

  prods.forEach(p => {
    const price = p.price || 499;
    const mrp = p.original_price || (price * 2);
    const disc = Math.round(((mrp - price) / mrp) * 100);
    const img = (Array.isArray(p.images) && p.images.length > 0) ? cleanPhotoUrl(p.images[0]) : 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg';

    const card = document.createElement('div');
    card.style.cssText = 'background: #fff; border: 1px solid var(--sk-border); border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.04);';
    card.onclick = () => { window.location.href = `product.html?id=${p.id}`; };

    card.innerHTML = `
      <div style="height: 180px; background: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden;">
        <img src="${img}" style="max-height: 100%; max-width: 100%; object-fit: cover;" onerror="this.src='assets/hero_fashion.jpg'">
      </div>
      <div style="padding: 12px;">
        <h4 style="font-size: 0.82rem; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">${p.title}</h4>
        <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px;">
          <span style="font-size: 1.05rem; font-weight: 800; color: #0f172a;">₹${price.toLocaleString()}</span>
          <span style="font-size: 0.78rem; color: #94a3b8; text-decoration: line-through;">₹${mrp.toLocaleString()}</span>
          <span style="font-size: 0.74rem; font-weight: 800; color: #16a34a;">${disc}% off</span>
        </div>
        <div style="font-size: 0.72rem; color: #16a34a; font-weight: 700;"><i class="ri-checkbox-circle-fill"></i> Free Express Delivery</div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// ----------------------------------------------------
// PINCODE ESTIMATOR
// ----------------------------------------------------
function checkPdpPincode() {
  const pin = document.getElementById('pdpPinInput').value.trim();
  const msg = document.getElementById('pdpPinResultMsg');
  if (pin.length === 6 && !isNaN(pin)) {
    msg.innerHTML = `<span style="color: #16a34a; font-weight: 700;"><i class="ri-checkbox-circle-fill"></i> Express Delivery Available to <strong>${pin}</strong> (Delivery by Tomorrow with Free COD)</span>`;
  } else {
    msg.innerHTML = `<span style="color: #ef4444; font-weight: 700;">Please enter a valid 6-digit postal pincode.</span>`;
  }
}
window.checkPdpPincode = checkPdpPincode;

// ----------------------------------------------------
// 1-CLICK ADD TO CART (WITH AUTH CHECK)
// ----------------------------------------------------
function handlePdpAddToCart() {
  if (!currentProduct) return;

  const user = window.auth ? window.auth.currentUser : null;
  if (!user) {
    showPdpToast('🔒 Please Login or Create an Account first!');
    sessionStorage.setItem('auth_redirect', window.location.href);
    setTimeout(() => {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}&reason=cart`;
    }, 1200);
    return;
  }

  let cart = [];
  try {
    const saved = localStorage.getItem('sk_cart');
    if (saved) cart = JSON.parse(saved);
  } catch (_) { cart = []; }

  const existIdx = cart.findIndex(i => String(i.id) === String(currentProduct.id) && i.selectedSize === selectedProductSize);
  if (existIdx > -1) {
    cart[existIdx].qty = (cart[existIdx].qty || 1) + 1;
  } else {
    cart.push({
      id: currentProduct.id,
      title: currentProduct.title,
      sellingPrice: currentProduct.sellingPrice,
      mrp: currentProduct.mrp,
      images: currentProduct.images,
      selectedSize: selectedProductSize,
      qty: 1
    });
  }

  localStorage.setItem('sk_cart', JSON.stringify(cart));
  updateCartBadgeHeader();
  showPdpToast(`🎉 Added to Cart! <a href="cart.html" style="color: #38bdf8; font-weight: 800; margin-left: 8px;">View Cart ↗</a>`);
}
window.handlePdpAddToCart = handlePdpAddToCart;

// ----------------------------------------------------
// 1-CLICK BUY NOW WITH 4-STEP CHECKOUT (WITH AUTH CHECK)
// ----------------------------------------------------
function handlePdpBuyNow() {
  if (!currentProduct) return;

  const buyNowCart = [{
    id: currentProduct.id,
    title: currentProduct.title,
    sellingPrice: currentProduct.sellingPrice,
    mrp: currentProduct.mrp,
    images: currentProduct.images,
    selectedSize: selectedProductSize,
    qty: 1
  }];

  localStorage.setItem('sk_cart', JSON.stringify(buyNowCart));

  const user = window.auth ? window.auth.currentUser : null;
  if (!user) {
    showPdpToast('🔒 Please Login or Create an Account to Buy!');
    sessionStorage.setItem('auth_redirect', 'cart.html');
    setTimeout(() => {
      window.location.href = `login.html?redirect=${encodeURIComponent('cart.html')}&reason=buy`;
    }, 1200);
    return;
  }

  window.location.href = 'cart.html';
}
window.handlePdpBuyNow = handlePdpBuyNow;

function updateCartBadgeHeader() {
  try {
    const saved = localStorage.getItem('sk_cart');
    if (saved) {
      const cart = JSON.parse(saved);
      const badge = document.getElementById('cartBadge');
      if (badge) badge.textContent = cart.reduce((sum, i) => sum + (i.qty || 1), 0);
    }
  } catch (_) {}
}

function showPdpToast(htmlMsg) {
  let container = document.getElementById('skToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'skToastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.style.cssText = 'background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 8px; border: 1px solid #2874f0; font-weight: 700; font-size: 0.88rem; box-shadow: 0 6px 18px rgba(0,0,0,0.3);';
  toast.innerHTML = htmlMsg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function handleSearchKey(e) {
  if (e.key === 'Enter') {
    const q = document.getElementById('skSearchInput').value.trim();
    if (q) window.location.href = `index.html?search=${encodeURIComponent(q)}`;
  }
}
window.handleSearchKey = handleSearchKey;
