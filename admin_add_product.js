// admin_add_product.js - Dedicated Product Creator & Multi-Image Engine

function getSupabase() {
  return window.supabase || window.supabaseClient || null;
}

let editingProductId = null;
let productImages = []; // Stores all active photo URLs / Base64 data
let coverImageIndex = 0;

// ---------- Toast Notification ----------
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

// ========================================================
// DYNAMIC CATEGORY MANAGEMENT ENGINE (ADD / REMOVE CATEGORIES)
// ========================================================
const DEFAULT_CATEGORIES = [
  'Ethnic Wear',
  'Western Wear',
  'Tech & Gadgets',
  'Home & Kitchen',
  'Beauty & Health',
  'Footwear & Bags',
  'Jewellery & Accessories',
  'General'
];

function getStoreCategories() {
  try {
    const saved = localStorage.getItem('tb_store_categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return [...DEFAULT_CATEGORIES];
}

function saveStoreCategories(cats) {
  localStorage.setItem('tb_store_categories', JSON.stringify(cats));
}

function renderCategoryDropdown(selectedVal = null) {
  const selectEl = document.getElementById('pCategory');
  if (!selectEl) return;

  const cats = getStoreCategories();
  if (selectedVal && !cats.includes(selectedVal)) {
    cats.push(selectedVal);
    saveStoreCategories(cats);
  }

  const currentVal = selectedVal || selectEl.value || (cats[0] || 'Ethnic Wear');

  selectEl.innerHTML = '';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    if (c === currentVal) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function openCategoryManagerModal() {
  renderCategoryListInModal();
  document.getElementById('categoryManagerModal').style.display = 'flex';
  const inp = document.getElementById('newCategoryInput');
  if (inp) {
    inp.value = '';
    setTimeout(() => inp.focus(), 100);
  }
}
window.openCategoryManagerModal = openCategoryManagerModal;

function closeCategoryManagerModal() {
  document.getElementById('categoryManagerModal').style.display = 'none';
}
window.closeCategoryManagerModal = closeCategoryManagerModal;

function renderCategoryListInModal() {
  const container = document.getElementById('categoryListContainer');
  if (!container) return;

  const cats = getStoreCategories();
  container.innerHTML = '';

  cats.forEach((cat) => {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: var(--edit-surface-subtle); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--edit-border); font-size: 0.88rem;';
    
    row.innerHTML = `
      <div style="font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
        <i class="ri-price-tag-3-fill" style="color: #38bdf8; font-size: 0.9rem;"></i>
        <span>${cat}</span>
      </div>
      <button type="button" onclick="deleteCategory('${cat}')" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;" title="Delete this category">
        <i class="ri-delete-bin-6-line"></i> Delete
      </button>
    `;
    container.appendChild(row);
  });
}

function addNewCategory() {
  const inp = document.getElementById('newCategoryInput');
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) {
    alert('Please enter a category name.');
    return;
  }

  const cats = getStoreCategories();
  if (cats.some(c => c.toLowerCase() === val.toLowerCase())) {
    alert('Category "' + val + '" already exists!');
    return;
  }

  cats.push(val);
  saveStoreCategories(cats);
  renderCategoryDropdown(val);
  renderCategoryListInModal();
  inp.value = '';
  showAdminToast(`✨ Category "${val}" added successfully!`, 'success');
}
window.addNewCategory = addNewCategory;

function deleteCategory(catName) {
  const cats = getStoreCategories();
  if (cats.length <= 1) {
    alert('You must have at least one category in the store.');
    return;
  }

  if (confirm(`Are you sure you want to delete category "${catName}"?`)) {
    const updated = cats.filter(c => c !== catName);
    saveStoreCategories(updated);
    renderCategoryDropdown();
    renderCategoryListInModal();
    showAdminToast(`🗑️ Category "${catName}" removed.`, 'info');
  }
}
window.deleteCategory = deleteCategory;

function toggleSizePill(el) {
  el.classList.toggle('active');
}

function getSelectedSizes() {
  const pills = document.querySelectorAll('.size-pill.active');
  const sizes = Array.from(pills).map(p => p.textContent.trim());
  return sizes.length > 0 ? sizes : ['Free Size'];
}

function setSelectedSizes(sizesArray) {
  const pills = document.querySelectorAll('.size-pill');
  pills.forEach(p => {
    p.classList.toggle('active', sizesArray.includes(p.textContent.trim()));
  });
}

// ========================================================
// ADVANCED IMAGE GALLERY & LOCAL FILE UPLOAD ENGINE
// ========================================================

function handleLocalFilesSelected(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (!productImages.includes(dataUrl)) {
        productImages.push(dataUrl);
        renderGalleryCards();
      }
    };
    reader.readAsDataURL(file);
  });

  showAdminToast(`Uploaded ${files.length} photos from computer!`, 'success');
  event.target.value = ''; // Reset file input
}
window.handleLocalFilesSelected = handleLocalFilesSelected;

function handleAddSingleUrl() {
  const input = document.getElementById('singleUrlInput');
  const url = input.value.trim();
  if (!url) return;

  if (!productImages.includes(url)) {
    productImages.push(url);
    renderGalleryCards();
    showAdminToast('Photo added to gallery!', 'success');
  }
  input.value = '';
}
window.handleAddSingleUrl = handleAddSingleUrl;

function setAsCover(idx) {
  if (idx >= 0 && idx < productImages.length) {
    coverImageIndex = idx;
    renderGalleryCards();
    showAdminToast('Set as Primary Cover Photo!', 'info');
  }
}
window.setAsCover = setAsCover;

function deleteGalleryImage(idx) {
  if (idx >= 0 && idx < productImages.length) {
    productImages.splice(idx, 1);
    if (coverImageIndex >= productImages.length) {
      coverImageIndex = Math.max(0, productImages.length - 1);
    }
    renderGalleryCards();
    showAdminToast('Photo removed from gallery', 'info');
  }
}
window.deleteGalleryImage = deleteGalleryImage;

function renderGalleryCards() {
  const container = document.getElementById('uploadedGalleryContainer');
  const badge = document.getElementById('photoCountBadge');
  if (!container) return;

  if (badge) badge.textContent = `${productImages.length} Photos Selected`;

  if (productImages.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--edit-text-muted); background: var(--edit-surface-subtle); border-radius: 8px; border: 1px dashed var(--edit-border);">
        <i class="ri-image-line" style="font-size: 2rem; display: block; margin-bottom: 6px; color: var(--edit-text-subtle);"></i>
        <span>No product photos selected yet. Upload files above or import from Meesho.</span>
      </div>
    `;
    updateLiveCardPreview();
    return;
  }

  let html = '';
  productImages.forEach((imgUrl, idx) => {
    const isCover = (idx === coverImageIndex);
    html += `
      <div class="gallery-card-item ${isCover ? 'cover-active' : ''}">
        <img src="${imgUrl}" class="gallery-card-img" alt="Photo ${idx + 1}" onerror="this.src='assets/hero_fashion.jpg'">
        ${isCover ? '<span class="gallery-cover-badge">COVER</span>' : ''}
        
        <div class="gallery-card-actions">
          ${!isCover ? `<button type="button" class="btn-card-action set-cover" onclick="setAsCover(${idx})"><i class="ri-star-fill"></i> Cover</button>` : ''}
          <button type="button" class="btn-card-action delete" onclick="deleteGalleryImage(${idx})"><i class="ri-delete-bin-line"></i> Delete</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  updateLiveCardPreview();
}

// Drag & Drop event bindings
function initDropZone() {
  const dropZone = document.getElementById('dropZone');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      handleLocalFilesSelected({ target: { files } });
    }
  }, false);
}

// ---------- Profit Engine Calculations ----------
function recalculateProfitEngine() {
  const cost = parseFloat(document.getElementById('pCost').value) || 0;
  const price = parseFloat(document.getElementById('pPrice').value) || 0;
  const mrp = parseFloat(document.getElementById('pMrp').value) || (price * 2);

  const profit = Math.max(0, price - cost);
  const marginPct = price > 0 ? Math.round((profit / price) * 100) : 0;
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  document.getElementById('calcProfitAmount').textContent = `+ ₹${profit.toLocaleString()}`;
  document.getElementById('calcProfitMargin').textContent = `${marginPct}%`;
  document.getElementById('calcDiscountTag').textContent = `${discountPct}% OFF`;

  updateLiveCardPreview();
}

// ---------- Live Card Preview ----------
function updateLiveCardPreview() {
  const title = document.getElementById('pTitle')?.value.trim() || 'Sample Product Title';
  const price = parseFloat(document.getElementById('pPrice')?.value) || 899;
  const mrp = parseFloat(document.getElementById('pMrp')?.value) || 2499;
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const prevTitle = document.getElementById('prevCardTitle');
  if (prevTitle) prevTitle.textContent = title;
  const prevPrice = document.getElementById('prevCardPrice');
  if (prevPrice) prevPrice.textContent = `₹${price.toLocaleString()}`;
  const prevMrp = document.getElementById('prevCardMrp');
  if (prevMrp) prevMrp.textContent = `₹${mrp.toLocaleString()}`;
  const prevDisc = document.getElementById('prevCardDiscount');
  if (prevDisc) prevDisc.textContent = `${discountPct}% off`;
  
  const imgEl = document.getElementById('prevCardImg');
  if (imgEl) {
    const coverUrl = (productImages.length > 0 && productImages[coverImageIndex]) ? productImages[coverImageIndex] : 'assets/hero_fashion.jpg';
    imgEl.src = coverUrl;
  }
}

function openMeeshoForExtract() {
  const url = document.getElementById('meeshoUrlInput').value.trim();
  if (url && url.includes('meesho.com')) {
    window.open(url, '_blank');
    showAdminToast('Opened Meesho. Click the TrendBazaar Extension to import details into this page!', 'info');
  } else {
    alert('Please enter a valid Meesho Product URL (e.g. https://www.meesho.com/s/p/...)');
  }
}

// ---------- Check URL Params (for Edit Mode & Extension Import) ----------
async function checkParamsAndPopulate() {
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');

  if (editId) {
    // Edit Product Mode
    editingProductId = editId;
    document.getElementById('pageMainHeading').innerHTML = `<i class="ri-edit-circle-fill" style="color: #38bdf8;"></i> Edit Product #${editId}`;
    document.getElementById('btnPublishLabel').textContent = 'Update Product';

    const sb = getSupabase();
    if (sb) {
      try {
        const { data: p } = await sb.from('products').select('*').eq('id', editId).single();
        if (p) {
          document.getElementById('pTitle').value = p.title || '';
          document.getElementById('pCost').value = p.meesho_price || '';
          document.getElementById('pPrice').value = p.price || '';
          document.getElementById('pMrp').value = p.original_price || '';
          document.getElementById('pDescription').value = p.description || '';
          if (p.video_url) {
            document.getElementById('pVideoUrl').value = p.video_url;
          }
          
          if (Array.isArray(p.images) && p.images.length > 0) {
            productImages = [...p.images];
          } else if (p.image) {
            productImages = [p.image];
          }

          document.getElementById('pCategory').value = p.category || 'General';
          if (p.sizes && Array.isArray(p.sizes)) {
            setSelectedSizes(p.sizes);
          }
          if (p.specs) {
            Object.entries(p.specs).forEach(([k, v]) => addSpecRow(k, v));
          } else {
            addSpecRow('Fabric / Material', 'Premium Blended Fabric');
            addSpecRow('Pattern / Style', 'Classic Design');
          }

          renderGalleryCards();
          recalculateProfitEngine();
        }
      } catch (e) {
        console.error('Edit load error:', e);
      }
    }
    return;
  }

  // Extension Import Params
  const title = params.get('title');
  if (title) {
    document.getElementById('pTitle').value = decodeURIComponent(title);
    document.getElementById('pCost').value = params.get('cost') || '450';
    document.getElementById('pPrice').value = params.get('price') || '899';
    document.getElementById('pMrp').value = params.get('mrp') || '2499';
    document.getElementById('pDescription').value = decodeURIComponent(params.get('desc') || '');

    const primaryImg = params.get('imgUrl');
    const photosParam = params.get('photos');

    productImages = [];
    if (photosParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(photosParam));
        if (Array.isArray(parsed)) productImages = parsed;
      } catch (_) {}
    }
    if (productImages.length === 0 && primaryImg) {
      productImages = [decodeURIComponent(primaryImg)];
    }

    const fullSpecsParam = params.get('fullSpecs');
    if (fullSpecsParam) {
      try {
        const specsObj = JSON.parse(decodeURIComponent(fullSpecsParam));
        Object.entries(specsObj).forEach(([k, v]) => addSpecRow(k, v));
      } catch (_) {
        addSpecRow('Fabric / Material', decodeURIComponent(params.get('fabric') || 'Blended Fabric'));
        addSpecRow('Pattern / Style', decodeURIComponent(params.get('pattern') || 'Classic Design'));
      }
    } else {
      addSpecRow('Fabric / Material', decodeURIComponent(params.get('fabric') || 'Blended Fabric'));
      addSpecRow('Pattern / Style', decodeURIComponent(params.get('pattern') || 'Classic Design'));
    }

    renderGalleryCards();
    recalculateProfitEngine();
    showAdminToast('🎉 Product data & photos imported from Meesho!', 'success');
  }
}

// ---------- Dynamic Specs Logic ----------
function addSpecRow(key = '', value = '') {
  const container = document.getElementById('dynamicSpecsContainer');
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '10px';
  row.innerHTML = `
    <input type="text" class="editor-input spec-key" placeholder="Spec Name (e.g. Fabric)" value="${key}" style="flex: 1;">
    <input type="text" class="editor-input spec-val" placeholder="Value (e.g. Cotton)" value="${value}" style="flex: 2;">
    <button type="button" class="adm-btn adm-btn-danger" onclick="this.parentElement.remove()" style="padding: 0 12px; font-size: 1.1rem;" title="Remove Spec"><i class="ri-delete-bin-line"></i></button>
  `;
  container.appendChild(row);
}
window.addSpecRow = addSpecRow;

// ---------- Publish / Save Product to Database ----------
async function handlePublishProductForm(e) {
  if (e) e.preventDefault();
  const sb = getSupabase();
  if (!sb) {
    alert('Database connection not available. Please try again.');
    return;
  }

  const title = document.getElementById('pTitle').value.trim();
  const cost = parseFloat(document.getElementById('pCost').value) || 0;
  const price = parseFloat(document.getElementById('pPrice').value);
  const mrp = parseFloat(document.getElementById('pMrp').value) || (price * 2);
  const category = document.getElementById('pCategory').value;
  const desc = document.getElementById('pDescription').value.trim();
  const video_url = document.getElementById('pVideoUrl').value.trim();
  
  const specsObj = {};
  document.querySelectorAll('#dynamicSpecsContainer > div').forEach(row => {
    const key = row.querySelector('.spec-key').value.trim();
    const val = row.querySelector('.spec-val').value.trim();
    if (key && val) specsObj[key] = val;
  });
  
  if (Object.keys(specsObj).length === 0) {
    specsObj['White-Label Warranty'] = '7 Days Instant Replacement';
  } else if (!specsObj['White-Label Warranty']) {
    specsObj['White-Label Warranty'] = '7 Days Instant Replacement';
  }

  if (!title || isNaN(price)) {
    alert('Please enter Product Title and Selling Price!');
    return;
  }

  if (productImages.length === 0) {
    alert('Please upload or add at least one product photo!');
    return;
  }

  // Reorder images so cover image is at index 0
  const finalImages = [
    productImages[coverImageIndex],
    ...productImages.filter((_, idx) => idx !== coverImageIndex)
  ];

  const selectedSizes = getSelectedSizes();
  const discount = `${Math.round(((mrp - price) / mrp) * 100)}% off`;

  const payload = {
    title,
    price,
    original_price: mrp,
    discount,
    images: finalImages,
    sizes: selectedSizes,
    description: desc,
    category,
    meesho_price: cost,
    specs: specsObj,
    video_url
  };

  const btn = document.getElementById('btnTopPublish');
  const origBtnText = btn.innerHTML;
  btn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Publishing...`;
  btn.disabled = true;

  try {
    if (editingProductId) {
      const { error } = await sb.from('products').update(payload).eq('id', editingProductId);
      if (error) throw error;
      showAdminToast('🎉 Product updated successfully!', 'success');
    } else {
      const { error } = await sb.from('products').insert([payload]);
      if (error) throw error;
      showAdminToast('🎉 Product successfully published to live storefront!', 'success');
    }

    setTimeout(() => {
      window.location.href = 'admin_master.html#products';
    }, 1200);

  } catch (err) {
    console.error('Publish error:', err);
    alert('Failed to publish product: ' + err.message);
    btn.innerHTML = origBtnText;
    btn.disabled = false;
  }
}
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

document.addEventListener('DOMContentLoaded', () => {
  checkMasterAdminAuth();
  renderCategoryDropdown();
  initDropZone();
  checkParamsAndPopulate();
  renderGalleryCards();
  recalculateProfitEngine();
});
