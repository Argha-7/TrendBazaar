/* ----------------------------------------------------
   TrendBazaar Meesho Exporter Content Script (content.js)
   Universal Multi-Engine Scraper (JSON-LD + NEXT_DATA + DOM + Meta)
   ---------------------------------------------------- */

console.log("🚀 TrendBazaar Meesho Universal Scraper Active!");

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

// UNIVERSAL MEESHO DATA EXTRACTOR
function extractUniversalMeeshoData() {
  let title = '';
  let price = 0;
  let images = [];
  let sizes = [];
  let description = '';
  let specs = {};

  // ENGINE 1: __NEXT_DATA__ Hydration State (Highest Accuracy for Real Product Name)
  const nextDataScript = document.getElementById('__NEXT_DATA__');
  if (nextDataScript && nextDataScript.textContent) {
    try {
      const ndData = JSON.parse(nextDataScript.textContent);

      // Direct Next.js Product Path check
      const directProd = ndData.props?.pageProps?.initialData?.product ||
        ndData.props?.pageProps?.product ||
        ndData.props?.pageProps?.data?.product ||
        ndData.props?.pageProps?.data;

      if (directProd) {
        if (directProd.name && typeof directProd.name === 'string' && directProd.name.toLowerCase() !== 'meesho') {
          title = cleanTitleString(directProd.name);
        } else if (directProd.title && typeof directProd.title === 'string' && directProd.title.toLowerCase() !== 'meesho') {
          title = cleanTitleString(directProd.title);
        }

        if (directProd.price || directProd.discounted_price || directProd.supplier_price) {
          price = parseInt(directProd.price || directProd.discounted_price || directProd.supplier_price, 10);
        }

        if (directProd.description) description = directProd.description;
      }

      // Deep scan if still missing
      function deepScan(obj) {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
          obj.forEach(item => deepScan(item));
        } else {
          // Product name
          if (!title && (obj.name || obj.title || obj.product_name) && typeof (obj.name || obj.title || obj.product_name) === 'string') {
            const candidate = cleanTitleString(obj.name || obj.title || obj.product_name);
            if (candidate.length > 5 && candidate.toLowerCase() !== 'meesho') {
              title = candidate;
            }
          }

          // Price
          if (!price && (obj.price || obj.discounted_price || obj.supplier_price || obj.selling_price)) {
            const pVal = parseInt(obj.price || obj.discounted_price || obj.supplier_price || obj.selling_price, 10);
            if (pVal > 20) price = pVal;
          }

          // Images
          for (const key in obj) {
            if (typeof obj[key] === 'string' && obj[key].includes('images.meesho.com/images/products/')) {
              const hd = cleanMeeshoHDUrl(obj[key]);
              if (hd && !images.includes(hd)) images.push(hd);
            }
          }

          // Sizes
          if ((key === 'valid_sizes' || key === 'sizes' || key === 'variations') && Array.isArray(obj[key])) {
            obj[key].forEach(v => {
              const sName = typeof v === 'string' ? v : (v.name || v.size);
              if (sName && !sizes.includes(sName)) sizes.push(sName);
            });
          }

          // Dynamic specs
          if (obj.attributes && Array.isArray(obj.attributes)) {
            obj.attributes.forEach(attr => {
              if (attr.name && attr.value) specs[attr.name] = attr.value;
            });
          }

          // Description
          if (obj.description && typeof obj.description === 'string' && obj.description.length > description.length) {
            description = obj.description.trim();
          }

          for (const key in obj) {
            if (typeof obj[key] === 'object') deepScan(obj[key]);
          }
        }
      }

      deepScan(ndData);
    } catch (_) { }
  }

  // ENGINE 2: SCHEMA JSON-LD (Filter out Organization & Breadcrumbs)
  if (!title) {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        if (data) {
          const type = data['@type'];
          // STRICT CHECK: ONLY PRODUCT SCHEMA
          if (type === 'Product' || type === 'ItemPage') {
            if (data.name) {
              const candidate = cleanTitleString(data.name);
              if (candidate && candidate.toLowerCase() !== 'meesho') title = candidate;
            }
            if (!description && data.description) description = data.description.trim();
            if (data.image) {
              const imgList = Array.isArray(data.image) ? data.image : [data.image];
              imgList.forEach(img => {
                const hd = cleanMeeshoHDUrl(typeof img === 'string' ? img : (img.url || ''));
                if (hd && !images.includes(hd)) images.push(hd);
              });
            }
            if (!price && data.offers) {
              const offerPrice = data.offers.price || data.offers.lowPrice || (Array.isArray(data.offers) ? data.offers[0]?.price : null);
              if (offerPrice) price = parseInt(offerPrice, 10);
            }
          }
        }
      } catch (_) { }
    });
  }

  // ENGINE 3: DOM HEADING & TITLES
  if (!title || title.length < 5 || title.toLowerCase() === 'meesho') {
    const headingEls = Array.from(document.querySelectorAll('h1, span[font-size], p[font-size], div[class*="ProductTitle"], span[class*="ProductTitle"], [data-testid="product-title"]'));
    for (const el of headingEls) {
      const txt = cleanTitleString(el.textContent);
      if (txt.length > 8 && txt.toLowerCase() !== 'meesho' && !txt.includes('Reviews') && !txt.includes('Ratings')) {
        title = txt;
        break;
      }
    }
  }

  // ENGINE 4: META TAGS (og:title / twitter:title / document.title)
  if (!title || title.length < 5 || title.toLowerCase() === 'meesho') {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content || document.querySelector('meta[name="twitter:title"]')?.content;
    if (ogTitle) {
      const candidate = cleanTitleString(ogTitle);
      if (candidate && candidate.toLowerCase() !== 'meesho') title = candidate;
    }
  }

  if (!title || title.length < 5 || title.toLowerCase() === 'meesho') {
    const docTitle = cleanTitleString(document.title);
    if (docTitle && docTitle.toLowerCase() !== 'meesho') title = docTitle;
  }

  // DOM Price Extractor
  if (!price || price < 20) {
    const priceCandidates = Array.from(document.querySelectorAll('h4, h3, h2, span, p, div')).filter(el =>
      el.children.length === 0 && el.textContent.includes('₹')
    );
    for (const el of priceCandidates) {
      const match = el.textContent.match(/₹\s*([\d,]+)/);
      if (match) {
        const num = parseInt(match[1].replace(/,/g, ''), 10);
        if (num >= 50) {
          price = num;
          break;
        }
      }
    }
  }

  // DOM Images
  if (images.length === 0) {
    const allImgs = Array.from(document.querySelectorAll('img[src*="images.meesho.com"]'));
    allImgs.forEach(img => {
      const hd = cleanMeeshoHDUrl(img.src);
      if (hd && !images.includes(hd)) images.push(hd);
    });
  }

  // DOM Sizes
  if (sizes.length === 0) {
    const sizeEls = Array.from(document.querySelectorAll('span, button, div')).filter(el => {
      const txt = el.textContent.trim();
      return ['Free Size', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'XS'].includes(txt);
    });
    sizeEls.forEach(el => {
      const s = el.textContent.trim();
      if (!sizes.includes(s)) sizes.push(s);
    });
  }

  // Fallbacks
  if (!title || title.toLowerCase() === 'meesho') title = 'Trendy Floral Designer Kurti Set';
  if (!price || price < 30) price = 499;
  if (images.length === 0) images = ['https://images.meesho.com/images/products/919864713/ysbzv_512.jpg'];
  if (sizes.length === 0) sizes = ['Free Size', 'S', 'M', 'L', 'XL'];
  if (!description) description = `High quality trending product with cash on delivery and 7-day easy replacement. Exported directly from Meesho.`;

  return {
    title,
    price,
    images: images.slice(0, 10),
    primaryImage: images[0],
    sizes,
    specs: Object.keys(specs).length > 0 ? specs : { 'Fabric / Material': 'Premium Blended Fabric', 'Pattern / Style': 'Floral Printed Design' },
    description,
    url: window.location.href
  };
}

// MESSAGE LISTENER FOR POPUP
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_MEESHO_PRODUCT_DATA') {
    const data = extractUniversalMeeshoData();
    sendResponse(data);
  }
  return true;
});

// FLOATING 1-CLICK EXPORT BUTTON ON MEESHO PAGES
function injectFloatingExportButton() {
  if (!document.body || document.getElementById('tbMeeshoFloatingBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'tbMeeshoFloatingBtn';
  btn.className = 'tb-extension-btn';
  btn.innerHTML = `🚀 Export to TrendBazaar`;
  btn.title = "1-Click Export Title, HD Photos, Price & Specs to Admin";

  btn.addEventListener('click', () => {
    const details = extractUniversalMeeshoData();
    showToast(`⚡ Exporting "${details.title.slice(0, 24)}..." with ${details.images.length} Photos to Admin!`);

    const allImgsParam = encodeURIComponent(JSON.stringify(details.images));
    const sizesParam = encodeURIComponent(details.sizes.join(','));
    const descParam = encodeURIComponent(details.description);
    const fullSpecsParam = encodeURIComponent(JSON.stringify(details.specs || {}));

    const targetUrl = `https://trend-bazaar-steel.vercel.app/admin_add_product.html?title=${encodeURIComponent(details.title)}&cost=${details.price}&price=${Math.round(details.price * 1.6)}&mrp=${details.price * 3}&imgUrl=${encodeURIComponent(details.primaryImage)}&photos=${allImgsParam}&sizes=${sizesParam}&fullSpecs=${fullSpecsParam}&desc=${descParam}&link=${encodeURIComponent(details.url)}`;

    window.open(targetUrl, '_blank');
  });

  document.body.appendChild(btn);
}

function showToast(msg) {
  let toast = document.getElementById('tbExtensionToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'tbExtensionToast';
    toast.className = 'tb-extension-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFloatingExportButton);
} else {
  injectFloatingExportButton();
}
setInterval(injectFloatingExportButton, 2000);
