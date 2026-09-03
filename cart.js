// cart.js - Meesho Professional Multi-Step Checkout Engine

function getCartSupabase() {
  if (window.getSupabase && typeof window.getSupabase === 'function') return window.getSupabase();
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;
  if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    window.supabaseClient = supabase.createClient(
      'https://qixszgjbbxdfzjouuwfx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeHN6Z2piYnhkZnpqb3V1d2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTA2MzYsImV4cCI6MjEwMzk4NjYzNn0.pzXkXmWx29JHA4V2l5IJHA11hu2NJTEisNMsJa-pCbQ'
    );
    return window.supabaseClient;
  }
  return null;
}

let skCart = [];
let currentStep = 1;
let editingItemIndex = -1;
let isResellingOrder = false;

let customerAddressData = {
  name: '',
  phone: '',
  house: '',
  road: '',
  pincode: '',
  city: '',
  state: '',
  landmark: ''
};

// ---------- Dynamic Theme & Branding Sync ----------
async function applyDynamicCartSettings() {
  const sb = getCartSupabase();
  if (!sb) return;
  try {
    const { data } = await sb.from('site_settings').select('*').eq('id', 1).single();
    if (data && data.primary_color) {
      document.documentElement.style.setProperty('--sk-primary', data.primary_color);
      document.documentElement.style.setProperty('--sk-primary-hover', data.primary_color);
    }
  } catch (_) {}
}

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

// ---------- Cart State Sync ----------
function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('sk_cart');
    if (saved) {
      skCart = JSON.parse(saved);
    } else {
      skCart = [];
    }
  } catch (e) {
    skCart = [];
  }
}

function saveCartToStorage() {
  localStorage.setItem('sk_cart', JSON.stringify(skCart));
}

// ---------- Multi-Step Stepper Navigation ----------
function navigateToStep(stepNum) {
  if (skCart.length === 0 && stepNum > 1) {
    showSkToast('Your cart is empty. Please add items first!');
    return;
  }

  if (stepNum >= 2) {
    const user = window.auth ? window.auth.currentUser : null;
    if (!user) {
      showSkToast('🔒 Please Login or Register to enter Delivery Address & place orders!');
      sessionStorage.setItem('auth_redirect', 'cart.html');
      setTimeout(() => {
        window.location.href = `login.html?redirect=${encodeURIComponent('cart.html')}&reason=buy`;
      }, 1200);
      return;
    }
  }

  // If jumping to step 3 or 4, check if address is filled
  if (stepNum >= 3 && (!customerAddressData.name || !customerAddressData.phone || !customerAddressData.pincode)) {
    showSkToast('Please fill delivery address details first!');
    stepNum = 2;
  }

  currentStep = stepNum;

  // Update Stepper Visuals (1 to 4)
  for (let i = 1; i <= 4; i++) {
    const stepEl = document.getElementById(`stepper${i}`);
    const lineEl = document.getElementById(`line${i}`);

    if (stepEl) {
      stepEl.classList.remove('active', 'completed');
      if (i < currentStep) {
        stepEl.classList.add('completed');
        stepEl.querySelector('.meesho-step-circle').innerHTML = '<i class="ri-check-line"></i>';
      } else if (i === currentStep) {
        stepEl.classList.add('active');
        stepEl.querySelector('.meesho-step-circle').textContent = i;
      } else {
        stepEl.querySelector('.meesho-step-circle').textContent = i;
      }
    }

    if (lineEl) {
      lineEl.classList.toggle('active', i < currentStep);
    }

    // Toggle Step Content Sections
    const sec = document.getElementById(`stepView${i}`);
    if (sec) {
      sec.style.display = (i === currentStep) ? 'block' : 'none';
    }
  }

  // Update Sidebar Main Continue Button Label
  const mainBtn = document.getElementById('btnMainContinue');
  if (mainBtn) {
    if (currentStep === 1) {
      mainBtn.textContent = 'Continue';
    } else if (currentStep === 2) {
      mainBtn.textContent = 'Deliver to this Address';
    } else if (currentStep === 3) {
      mainBtn.textContent = 'Continue to Summary';
    } else if (currentStep === 4) {
      mainBtn.innerHTML = `<i class="ri-flashlight-fill"></i> Place Order`;
      mainBtn.style.background = '#059669';
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleMainContinueClick() {
  if (currentStep === 1) {
    navigateToStep(2);
  } else if (currentStep === 2) {
    document.getElementById('addressForm').requestSubmit();
  } else if (currentStep === 3) {
    navigateToStep(4);
  } else if (currentStep === 4) {
    submitFinalOrder();
  }
}

// ---------- Render Step 1: Cart Items ----------
function renderCartItems() {
  const container = document.getElementById('cartItemsListContainer');
  const sideCount = document.getElementById('sideItemCount');
  if (!container) return;

  const totalQty = skCart.reduce((acc, item) => acc + (item.qty || 1), 0);
  if (sideCount) sideCount.textContent = totalQty;

  if (skCart.length === 0) {
    container.innerHTML = `
      <div style="padding: 60px 20px; text-align: center;">
        <i class="ri-shopping-cart-2-line" style="font-size: 3.5rem; color: #cbd5e1; display: block; margin-bottom: 12px;"></i>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a;">Your cart is empty</h3>
        <p style="color: #64748b; font-size: 0.88rem; margin: 6px 0 20px;">Explore our ethnic wear, electronics & trending gadgets.</p>
        <a href="index.html" class="meesho-btn-continue" style="display: inline-flex; width: auto; padding: 12px 28px; text-decoration: none;">
          View Products
        </a>
      </div>
    `;
    updatePriceSummary(0, 0);
    return;
  }

  let html = '';
  let grossProductPrice = 0;
  let totalSellingPrice = 0;

  skCart.forEach((item, idx) => {
    const qty = item.qty || 1;
    const mrp = Number(item.mrp) || (Number(item.sellingPrice) * 2);
    const selling = Number(item.sellingPrice) || 0;

    grossProductPrice += (mrp * qty);
    totalSellingPrice += (selling * qty);

    const discountPct = mrp > selling ? Math.round(((mrp - selling) / mrp) * 100) : 0;
    const itemImg = (Array.isArray(item.images) && item.images.length > 0) ? cleanMeeshoHDUrl(item.images[0]) : (item.image || 'assets/hero_fashion.jpg');

    html += `
      <div class="meesho-item-card">
        <img src="${itemImg}" class="meesho-item-img" alt="${item.title}" onerror="this.src='assets/hero_fashion.jpg'">
        <div class="meesho-item-info">
          <div class="meesho-item-title">${item.title}</div>
          
          <div class="meesho-item-pricing">
            <span class="meesho-price-current">₹${selling * qty}</span>
            <span class="meesho-price-mrp">₹${mrp * qty}</span>
            <span class="meesho-discount-tag">${discountPct}% Off</span>
          </div>

          <div class="meesho-badge-returns">
            <i class="ri-checkbox-circle-fill" style="color: #10b981;"></i> All issue easy returns
          </div>

          <div class="meesho-meta-row">
            Size: <strong>${item.selectedSize || 'Free Size'}</strong> • Qty: <strong>${qty}</strong>
          </div>

          <div>
            <button class="meesho-btn-remove" onclick="removeCartItem(${idx})">
              <i class="ri-close-line"></i> REMOVE
            </button>
          </div>
        </div>

        <button class="meesho-btn-edit" onclick="openEditModal(${idx})">EDIT</button>
      </div>

      <div class="meesho-supplier-row">
        Sold by: <strong>Verified TrendBazaar Dropship Supplier</strong>
      </div>
    `;
  });

  container.innerHTML = html;
  updatePriceSummary(grossProductPrice, totalSellingPrice);
  renderSummaryReviewItems();
}

let appliedCoupon = null;
let currentCouponDiscountAmount = 0;

function getActiveStoreCoupons() {
  const DEFAULT_STORE_COUPONS = [
    { code: 'TREND50', type: 'flat', val: 50, min: 399, status: 'active' },
    { code: 'WELCOME100', type: 'flat', val: 100, min: 699, status: 'active' },
    { code: 'SAVE10', type: 'percent', val: 10, min: 299, status: 'active' },
    { code: 'FREESHIP', type: 'flat', val: 0, min: 199, status: 'active' }
  ];
  try {
    const saved = localStorage.getItem('tb_store_coupons');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_STORE_COUPONS;
}

function autoFillCoupon(code) {
  const inp = document.getElementById('cartCouponInput');
  if (inp) inp.value = code;
  applyCartCoupon();
}
window.autoFillCoupon = autoFillCoupon;

function applyCartCoupon() {
  const inp = document.getElementById('cartCouponInput');
  if (!inp) return;
  const code = inp.value.trim().toUpperCase();
  if (!code) {
    showSkToast('Please enter a coupon code');
    return;
  }

  const coupons = getActiveStoreCoupons();
  const c = coupons.find(item => item.code === code && item.status === 'active');
  if (!c) {
    showSkToast('❌ Invalid or expired coupon code');
    return;
  }

  let cartSubtotal = skCart.reduce((sum, i) => sum + (Number(i.sellingPrice) * (i.qty || 1)), 0);
  if (cartSubtotal < (c.min || 0)) {
    showSkToast(`⚠️ Minimum order value of ₹${c.min} required for coupon ${c.code}`);
    return;
  }

  appliedCoupon = c;
  showSkToast(`🎉 Coupon "${c.code}" applied successfully!`);
  renderCartItems();
}
window.applyCartCoupon = applyCartCoupon;

function removeCartCoupon() {
  appliedCoupon = null;
  currentCouponDiscountAmount = 0;
  const inp = document.getElementById('cartCouponInput');
  if (inp) inp.value = '';
  showSkToast('Coupon removed');
  renderCartItems();
}
window.removeCartCoupon = removeCartCoupon;

function updatePriceSummary(grossMrp, totalSelling) {
  currentCouponDiscountAmount = 0;

  const couponRow = document.getElementById('sideCouponRow');
  const appliedTag = document.getElementById('appliedCouponTag');
  const appliedCodeText = document.getElementById('appliedCouponCodeText');

  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      currentCouponDiscountAmount = Math.round((totalSelling * appliedCoupon.val) / 100);
    } else {
      currentCouponDiscountAmount = appliedCoupon.val;
    }

    if (couponRow) {
      couponRow.style.display = 'flex';
      document.getElementById('sideCouponDiscount').textContent = `- ₹${currentCouponDiscountAmount.toLocaleString()}`;
    }
    if (appliedTag) {
      appliedTag.style.display = 'flex';
      appliedCodeText.textContent = appliedCoupon.code;
    }
  } else {
    if (couponRow) couponRow.style.display = 'none';
    if (appliedTag) appliedTag.style.display = 'none';
  }

  const finalPayable = Math.max(0, totalSelling - currentCouponDiscountAmount);
  const totalSavings = Math.max(0, (grossMrp - totalSelling) + currentCouponDiscountAmount);

  document.getElementById('sideProductPrice').textContent = `+ ₹${grossMrp.toLocaleString()}`;
  document.getElementById('sideDiscount').textContent = `- ₹${(grossMrp - totalSelling).toLocaleString()}`;
  document.getElementById('sideOrderTotal').textContent = `₹${finalPayable.toLocaleString()}`;
  document.getElementById('sideSavingsChip').innerHTML = `<i class="ri-checkbox-circle-fill"></i> <span>Yay! Your total savings are ₹${totalSavings.toLocaleString()}</span>`;
}

function removeCartItem(idx) {
  if (confirm('Are you sure you want to remove this item?')) {
    skCart.splice(idx, 1);
    saveCartToStorage();
    renderCartItems();
    showSkToast('Item removed from cart');
  }
}

// ---------- Edit Item Modal ----------
function openEditModal(idx) {
  editingItemIndex = idx;
  const item = skCart[idx];
  if (!item) return;

  document.getElementById('editModalSizeSelect').value = item.selectedSize || 'Free Size';
  document.getElementById('editModalQtyVal').textContent = item.qty || 1;
  document.getElementById('editItemModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editItemModal').style.display = 'none';
  editingItemIndex = -1;
}

function adjustEditModalQty(change) {
  const el = document.getElementById('editModalQtyVal');
  let val = parseInt(el.textContent) || 1;
  val = Math.max(1, val + change);
  el.textContent = val;
}

function saveItemEdit() {
  if (editingItemIndex >= 0 && skCart[editingItemIndex]) {
    const size = document.getElementById('editModalSizeSelect').value;
    const qty = parseInt(document.getElementById('editModalQtyVal').textContent) || 1;

    skCart[editingItemIndex].selectedSize = size;
    skCart[editingItemIndex].qty = qty;

    saveCartToStorage();
    renderCartItems();
    closeEditModal();
    showSkToast('Product variant updated!');
  }
}

// ---------- Step 2: Address Form Handler ----------
function handleAddressSubmit(e) {
  e.preventDefault();

  customerAddressData = {
    name: document.getElementById('custName').value.trim(),
    phone: document.getElementById('custPhone').value.trim(),
    house: document.getElementById('custHouse').value.trim(),
    road: document.getElementById('custRoad').value.trim(),
    pincode: document.getElementById('custPincode').value.trim(),
    city: document.getElementById('custCity').value.trim(),
    state: document.getElementById('custState').value.trim(),
    landmark: document.getElementById('custLandmark').value.trim()
  };

  // Sync to Summary Review View
  const fullAddress = `${customerAddressData.house}, ${customerAddressData.road}, ${customerAddressData.landmark ? customerAddressData.landmark + ', ' : ''}${customerAddressData.city}, ${customerAddressData.state} - ${customerAddressData.pincode}`;
  document.getElementById('sumCustomerName').textContent = customerAddressData.name;
  document.getElementById('sumCustomerAddress').textContent = fullAddress;
  document.getElementById('sumCustomerPhone').textContent = customerAddressData.phone;

  navigateToStep(3);
}



// ---------- Step 4: Summary Review Items ----------
function renderSummaryReviewItems() {
  const container = document.getElementById('summaryItemsList');
  if (!container) return;

  let html = '';
  skCart.forEach(item => {
    const qty = item.qty || 1;
    const itemImg = (Array.isArray(item.images) && item.images.length > 0) ? cleanMeeshoHDUrl(item.images[0]) : (item.image || 'assets/hero_fashion.jpg');

    html += `
      <div style="display: flex; gap: 14px; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; align-items: center;">
        <img src="${itemImg}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover;" onerror="this.src='assets/hero_fashion.jpg'">
        <div style="flex: 1; font-size: 0.85rem;">
          <div style="font-weight: 700; color: #0f172a;">${item.title}</div>
          <span style="color: #64748b; font-size: 0.78rem;">Size: ${item.selectedSize || 'Free Size'} • Qty: ${qty}</span>
        </div>
        <strong style="font-size: 0.95rem; color: #0f172a;">₹${Number(item.sellingPrice) * qty}</strong>
      </div>
    `;
  });

  container.innerHTML = html;
}

let lastPlacedOrderData = null;

// ---------- Submit Final Order to Supabase ----------
async function submitFinalOrder() {
  if (skCart.length === 0) {
    showSkToast('Your cart is empty!');
    return;
  }

  const btn = document.getElementById('btnMainContinue');
  const originalText = btn.innerHTML;
  btn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Placing Order...`;
  btn.disabled = true;

  try {
    const fullAddress = `${customerAddressData.house}, ${customerAddressData.road}, ${customerAddressData.city}, ${customerAddressData.state} - ${customerAddressData.pincode}`;
    const userUid = auth && auth.currentUser ? auth.currentUser.uid : 'guest_' + Math.random().toString(36).substring(2, 9);

    const paymentMode = document.querySelector('input[name="paymentMode"]:checked')?.value === 'online' ? 'Online UPI' : 'Cash on Delivery (COD)';
    
    const serverPayload = {
      user_id: userUid,
      customer_name: customerAddressData.name,
      customer_phone: customerAddressData.phone,
      customer_address: fullAddress,
      payment_mode: paymentMode,
      items: skCart.map(i => ({
        id: i.id,
        title: i.title,
        sellingPrice: i.sellingPrice,
        mrp: i.mrp,
        size: i.selectedSize,
        qty: i.qty || 1,
        images: i.images
      }))
    };

    let serverOrder = null;
    try {
      const sResp = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverPayload)
      });
      if (sResp.ok) {
        serverOrder = await sResp.json();
      }
    } catch (apiErr) {
      console.warn("Backend server API unreachable, executing client fallback:", apiErr);
    }

    let finalOrderId = serverOrder ? serverOrder.order_id : ('TB-ORD-' + Math.floor(100000 + Math.random() * 900000));
    let finalTxnId = serverOrder ? serverOrder.transaction_id : ((paymentMode.includes('UPI') ? 'TXN-UPI-' : 'TXN-COD-') + Date.now().toString().slice(-8));
    let finalInvoiceNo = serverOrder ? serverOrder.invoice_no : ('INV-' + finalOrderId.replace('TB-ORD-', ''));

    // If backend was offline, perform direct fallback insert to Supabase
    if (!serverOrder) {
      const sb = getCartSupabase();
      for (const item of skCart) {
        const pId = isNaN(item.id) ? null : Number(item.id);
        const img = (Array.isArray(item.images) && item.images.length > 0) ? item.images[0] : (item.image || '');

        const payload = {
          firebase_uid: userUid,
          product_id: pId,
          product_title: item.title,
          product_price: Number(item.sellingPrice) * (item.qty || 1),
          product_image: img,
          size: item.selectedSize || 'Free Size',
          status: 'Order Placed',
          customer_name: customerAddressData.name,
          customer_phone: customerAddressData.phone,
          customer_address: fullAddress
        };

        if (sb) {
          await sb.from('orders').insert([payload]);
        }
      }
    }

    // Capture Invoice Data Snapshot before clearing cart
    lastPlacedOrderData = {
      orderId: finalOrderId,
      txnId: finalTxnId,
      paymentMode: paymentMode,
      invoiceNo: finalInvoiceNo,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      customer: { ...customerAddressData, fullAddress: fullAddress },
      items: serverOrder ? serverOrder.items : JSON.parse(JSON.stringify(skCart)),
      grossMrp: serverOrder ? serverOrder.gross_mrp : null,
      totalDiscount: serverOrder ? serverOrder.total_discount : null,
      grandTotal: serverOrder ? serverOrder.grand_total : null
    };

    // Update Confirmation Screen Tags
    document.getElementById('placedOrderIdTag').textContent = `#${finalOrderId}`;
    document.getElementById('placedTxnIdTag').textContent = finalTxnId;
    document.getElementById('placedPaymentModeTag').textContent = paymentMode;

    // Clear Cart
    skCart = [];
    saveCartToStorage();

    // Display Step 5 Success Screen
    document.getElementById('checkoutMainContainer').style.display = 'none';
    document.getElementById('orderSuccessScreen').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    console.error('Order Error:', err);
    alert('Failed to place order: ' + err.message);
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ---------- Invoice Modal Handlers ----------
function openInvoiceModal() {
  if (!lastPlacedOrderData) return;

  const d = lastPlacedOrderData;
  document.getElementById('invNumTag').textContent = d.invoiceNo;
  document.getElementById('invDateTag').textContent = d.date;
  document.getElementById('invPayModeTag').textContent = d.paymentMode;
  document.getElementById('invCustName').textContent = d.customer.name;
  document.getElementById('invCustAddress').textContent = d.customer.fullAddress;
  document.getElementById('invCustPhone').textContent = '+91 ' + d.customer.phone;
  document.getElementById('invTxnIdTag').textContent = d.txnId;
  document.getElementById('invOrderIdTag').textContent = '#' + d.orderId;

  const tbody = document.getElementById('invItemsTbody');
  if (tbody) {
    tbody.innerHTML = '';
    let grossSubtotal = 0;
    let netTotal = 0;

    d.items.forEach((item, index) => {
      const qty = item.qty || 1;
      const unitMrp = Number(item.mrp) || (Number(item.sellingPrice) * 2);
      const unitPrice = Number(item.sellingPrice) || 0;
      const itemTotal = unitPrice * qty;

      grossSubtotal += (unitMrp * qty);
      netTotal += itemTotal;

      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #f1f5f9';
      tr.innerHTML = `
        <td style="padding: 10px 12px; color: #64748b;">${index + 1}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${item.title}</td>
        <td style="padding: 10px 12px; color: #475569;">${item.selectedSize || 'Free Size'}</td>
        <td style="padding: 10px 12px; text-align: center; font-weight: 800;">${qty}</td>
        <td style="padding: 10px 12px; text-align: right; color: #475569;">₹${unitPrice.toLocaleString()}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: #0f172a;">₹${itemTotal.toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });

    const discount = grossSubtotal - netTotal;
    document.getElementById('invGrossSubtotal').textContent = `₹${grossSubtotal.toLocaleString()}`;
    document.getElementById('invTotalDiscount').textContent = `- ₹${discount.toLocaleString()}`;
    document.getElementById('invGrandTotal').textContent = `₹${netTotal.toLocaleString()}`;
  }

  document.getElementById('invoiceModal').style.display = 'flex';
}
window.openInvoiceModal = openInvoiceModal;

function closeInvoiceModal() {
  document.getElementById('invoiceModal').style.display = 'none';
}
window.closeInvoiceModal = closeInvoiceModal;

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  applyDynamicCartSettings();
  loadCartFromStorage();
  renderCartItems();
  navigateToStep(1);
});
