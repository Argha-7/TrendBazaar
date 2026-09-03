// popup.js - TrendBazaar Meesho Product Exporter Extension

document.addEventListener('DOMContentLoaded', () => {
  const popImg = document.getElementById('popImg');
  const popTitle = document.getElementById('popTitle');
  const popCost = document.getElementById('popCost');
  const popSellingInput = document.getElementById('popSellingInput');
  const popGalleryStrip = document.getElementById('popGalleryStrip');
  const btnPublish = document.getElementById('btnPublishDirect');
  const btnAdmin = document.getElementById('btnOpenAdmin');
  const toastMsg = document.getElementById('toastMsg');
  const statusChip = document.getElementById('statusChip');

  let extractedData = {
    title: 'Trendy Floral Designer Kurti Set',
    price: 499,
    images: ['https://images.meesho.com/images/products/919864713/ysbzv_512.jpg'],
    primaryImage: 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg',
    sizes: ['Free Size', 'S', 'M', 'L', 'XL'],
    specs: { 'Fabric / Material': 'Premium Blended Fabric' },
    description: 'High quality trending product with cash on delivery and easy 7-day replacement.',
    url: 'https://www.meesho.com'
  };

  function updatePopupUI(data) {
    extractedData = data;
    if (popTitle) popTitle.textContent = data.title;
    if (popCost) popCost.textContent = '₹' + data.price;
    if (popSellingInput) popSellingInput.value = Math.round(data.price * 1.6);
    
    if (popImg) {
      popImg.onerror = function() { this.src = 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg'; };
      popImg.src = data.primaryImage || data.images[0] || 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg';
    }

    renderPopupGallery(data.images, data.primaryImage);
    if (toastMsg) toastMsg.textContent = `✨ Extracted "${data.title.slice(0, 20)}..." & ${data.images.length} Photos!`;
  }

  function renderPopupGallery(images, activeImg) {
    if (!popGalleryStrip) return;
    popGalleryStrip.innerHTML = '';

    images.forEach((imgUrl, idx) => {
      const thumb = document.createElement('img');
      thumb.className = 'gallery-thumb' + (imgUrl === activeImg ? ' active' : '');
      thumb.src = imgUrl;
      thumb.alt = 'Photo ' + (idx + 1);
      thumb.onerror = function() { this.src = 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg'; };
      
      thumb.addEventListener('click', () => {
        extractedData.primaryImage = imgUrl;
        if (popImg) popImg.src = imgUrl;
        document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });

      popGalleryStrip.appendChild(thumb);
    });
  }

  // 1. QUERY ACTIVE MEESHO TAB
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0 && tabs[0].url && tabs[0].url.includes('meesho.com')) {
      if (statusChip) {
        statusChip.textContent = 'Active on Meesho';
        statusChip.style.background = 'rgba(16, 185, 129, 0.2)';
      }

      // Try Message Passing first
      chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_MEESHO_PRODUCT_DATA' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.title || response.title.toLowerCase() === 'meesho') {
          // Fallback to in-tab execution
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: inTabExtractor
          }, (results) => {
            if (results && results[0] && results[0].result) {
              updatePopupUI(results[0].result);
            }
          });
        } else {
          updatePopupUI(response);
        }
      });
    } else {
      if (statusChip) {
        statusChip.textContent = 'Demo Mode';
        statusChip.style.background = 'rgba(99, 102, 241, 0.2)';
      }
      renderPopupGallery(extractedData.images, extractedData.primaryImage);
    }
  });

  // 2. EXPORT DIRECTLY TO ADMIN
  if (btnPublish) {
    btnPublish.addEventListener('click', () => {
      const selling = parseFloat(popSellingInput.value) || Math.round(extractedData.price * 1.6);
      const mrp = Math.round(selling * 2.2);

      const mainPhotos = extractedData.images && extractedData.images.length > 0 
        ? [extractedData.primaryImage, ...extractedData.images.filter(i => i !== extractedData.primaryImage)]
        : [extractedData.primaryImage];

      const allImgsParam = encodeURIComponent(JSON.stringify(mainPhotos));
      const sizesParam = encodeURIComponent((extractedData.sizes || ['Free Size']).join(','));
      const descParam = encodeURIComponent(extractedData.description || '');
      const fullSpecsParam = encodeURIComponent(JSON.stringify(extractedData.specs || {}));

      const targetUrl = `https://trend-bazaar-steel.vercel.app/admin_add_product.html?title=${encodeURIComponent(extractedData.title)}&cost=${extractedData.price}&price=${selling}&mrp=${mrp}&imgUrl=${encodeURIComponent(extractedData.primaryImage)}&photos=${allImgsParam}&sizes=${sizesParam}&fullSpecs=${fullSpecsParam}&desc=${descParam}&link=${encodeURIComponent(extractedData.url)}`;

      chrome.tabs.create({ url: targetUrl });
    });
  }

  if (btnAdmin) {
    btnAdmin.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://trend-bazaar-steel.vercel.app/admin_master.html' });
    });
  }
});

// In-tab direct script fallback
function inTabExtractor() {
  function cleanMeeshoHDUrl(url) {
    if (!url) return '';
    let clean = url.split('?')[0];
    clean = clean.replace(/_\d+\.(jpg|webp|jpeg)/g, '_512.jpg').replace(/\/whwdt_\d+\./g, '/whwdt_512.');
    return clean;
  }

  function cleanTitleString(raw) {
    if (!raw) return '';
    let clean = raw.trim();
    if (clean.toLowerCase() === 'meesho') return '';
    clean = clean.replace(/\|\s*Meesho.*/gi, '');
    clean = clean.replace(/-\s*Meesho.*/gi, '');
    clean = clean.replace(/Buy\s+/gi, '');
    clean = clean.replace(/Online\s+at\s+Best\s+Prices?\s+in\s+India.*/gi, '');
    clean = clean.replace(/at\s+Lowest\s+Prices?.*/gi, '');
    clean = clean.replace(/on\s+Meesho.*/gi, '');
    return clean.trim();
  }

  let title = '';
  let price = 0;
  let images = [];
  let sizes = [];
  let description = '';
  let specs = {};

  // 1. Next.js Hydration Tree check
  const nd = document.getElementById('__NEXT_DATA__');
  if (nd && nd.textContent) {
    try {
      const d = JSON.parse(nd.textContent);
      const direct = d.props?.pageProps?.initialData?.product || d.props?.pageProps?.product || d.props?.pageProps?.data;
      if (direct && direct.name && direct.name.toLowerCase() !== 'meesho') {
        title = cleanTitleString(direct.name);
      }
      if (direct && (direct.price || direct.supplier_price)) {
        price = parseInt(direct.price || direct.supplier_price, 10);
      }

      function scan(o) {
        if (!o || typeof o !== 'object') return;
        if (Array.isArray(o)) {
          o.forEach(item => scan(item));
        } else {
          if (!title && (o.name || o.title)) {
            const val = cleanTitleString(o.name || o.title);
            if (val.length > 5 && val.toLowerCase() !== 'meesho') title = val;
          }
          if (!price && (o.price || o.discounted_price || o.supplier_price)) {
            const p = parseInt(o.price || o.discounted_price || o.supplier_price, 10);
            if (p > 20) price = p;
          }
          for (const k in o) {
            if (typeof o[k] === 'string' && o[k].includes('images.meesho.com/images/products/')) {
              const hd = cleanMeeshoHDUrl(o[k]);
              if (!images.includes(hd)) images.push(hd);
            }
          }
          if ((o.valid_sizes || o.sizes) && Array.isArray(o.valid_sizes || o.sizes)) {
            (o.valid_sizes || o.sizes).forEach(s => {
              const sn = typeof s === 'string' ? s : (s.name || s.size);
              if (sn && !sizes.includes(sn)) sizes.push(sn);
            });
          }
          if (o.attributes && Array.isArray(o.attributes)) {
            o.attributes.forEach(a => {
              if (a.name && a.value) specs[a.name] = a.value;
            });
          }
          for (const k in o) {
            if (typeof o[k] === 'object') scan(o[k]);
          }
        }
      }
      scan(d);
    } catch (_) {}
  }

  // 2. JSON-LD Schema (Strict Product Only)
  if (!title) {
    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    ldScripts.forEach(s => {
      try {
        const d = JSON.parse(s.textContent);
        if (d && (d['@type'] === 'Product' || d['@type'] === 'ItemPage')) {
          if (d.name) {
            const candidate = cleanTitleString(d.name);
            if (candidate && candidate.toLowerCase() !== 'meesho') title = candidate;
          }
          if (!price && d.offers) {
            const op = d.offers.price || d.offers.lowPrice;
            if (op) price = parseInt(op, 10);
          }
        }
      } catch (_) {}
    });
  }

  // 3. DOM Heading Fallback
  if (!title || title.length < 5 || title.toLowerCase() === 'meesho') {
    const h1Els = Array.from(document.querySelectorAll('h1, [data-testid="product-title"], [class*="ProductTitle"]'));
    for (const el of h1Els) {
      const txt = cleanTitleString(el.textContent);
      if (txt.length > 8 && txt.toLowerCase() !== 'meesho') {
        title = txt;
        break;
      }
    }
  }

  if (!title || title.length < 5 || title.toLowerCase() === 'meesho') {
    const docTitle = cleanTitleString(document.title);
    if (docTitle && docTitle.toLowerCase() !== 'meesho') title = docTitle;
  }

  if (images.length === 0) {
    const dImgs = Array.from(document.querySelectorAll('img[src*="images.meesho.com"]'));
    dImgs.forEach(i => {
      const hd = cleanMeeshoHDUrl(i.src);
      if (hd && !images.includes(hd)) images.push(hd);
    });
  }

  if (sizes.length === 0) sizes = ['Free Size', 'S', 'M', 'L', 'XL'];

  return {
    title: title || 'Trendy Floral Designer Kurti Set',
    price: price || 499,
    images: images.length > 0 ? images.slice(0, 10) : ['https://images.meesho.com/images/products/919864713/ysbzv_512.jpg'],
    primaryImage: images[0] || 'https://images.meesho.com/images/products/919864713/ysbzv_512.jpg',
    sizes,
    specs,
    description: description || 'High quality trending product with cash on delivery and 7-day replacement.',
    url: window.location.href
  };
}
