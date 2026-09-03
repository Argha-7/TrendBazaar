let homepageLayout = [];

// Initialize
async function loadHomepageBuilder() {
  const sb = window.getSupabase();
  if (!sb) return;

  try {
    const { data } = await sb.from('site_settings').select('homepage_layout').eq('id', 1).single();
    if (data && data.homepage_layout) {
      homepageLayout = Array.isArray(data.homepage_layout) ? data.homepage_layout : [];
    }
  } catch (e) {
    console.error("Failed to load layout", e);
  }
  renderBuilderUI();
}

function renderBuilderUI() {
  const container = document.getElementById('homepageBuilderList');
  if (!container) return;

  container.innerHTML = '';
  if (homepageLayout.length === 0) {
    container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--adm-text-muted); border: 2px dashed var(--adm-border); border-radius: var(--adm-radius-md);">
      <i class="ri-layout-masonry-line" style="font-size: 2rem; display: block; margin-bottom: 8px;"></i>
      <p>No sections added yet. Click "Add New Section" to start building your homepage.</p>
    </div>`;
    return;
  }

  homepageLayout.forEach((section, index) => {
    const el = document.createElement('div');
    el.className = 'adm-builder-section';
    el.style.border = '1px solid var(--adm-border)';
    el.style.borderRadius = 'var(--adm-radius-md)';
    el.style.padding = '16px';
    el.style.background = '#f8fafc';
    el.style.marginBottom = '12px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '12px';
    header.innerHTML = `
      <div style="font-weight: 800; color: var(--adm-text-main); font-size: 1.05rem;">
        <i class="${getIconForType(section.type)}" style="color: var(--adm-primary); margin-right: 6px;"></i>
        ${formatType(section.type)} Section
      </div>
      <div style="display: flex; gap: 6px;">
        <button class="adm-btn-secondary" onclick="moveSectionUp(${index})" ${index === 0 ? 'disabled' : ''} style="padding: 6px;"><i class="ri-arrow-up-line"></i></button>
        <button class="adm-btn-secondary" onclick="moveSectionDown(${index})" ${index === homepageLayout.length - 1 ? 'disabled' : ''} style="padding: 6px;"><i class="ri-arrow-down-line"></i></button>
        <button class="adm-action-btn delete" onclick="deleteSection(${index})" style="padding: 6px;"><i class="ri-delete-bin-line"></i></button>
      </div>
    `;
    el.appendChild(header);

    // Section specific fields
    const body = document.createElement('div');
    
    if (section.type === 'hero') {
      body.innerHTML = `
        <div class="adm-form-group">
          <label class="adm-form-label">Hero Title (Optional):</label>
          <input type="text" class="adm-form-input" value="${section.title || ''}" onchange="updateSectionField(${index}, 'title', this.value)">
        </div>
      `;
    } else if (section.type === 'grid') {
      body.innerHTML = `
        <div class="adm-form-group">
          <label class="adm-form-label">Grid Title:</label>
          <input type="text" class="adm-form-input" value="${section.title || 'Trending Now'}" onchange="updateSectionField(${index}, 'title', this.value)">
        </div>
        <div class="adm-form-group">
          <label class="adm-form-label">Product Limit:</label>
          <input type="number" class="adm-form-input" value="${section.limit || 8}" onchange="updateSectionField(${index}, 'limit', parseInt(this.value))">
        </div>
      `;
    } else if (section.type === 'deals') {
      body.innerHTML = `
        <div class="adm-form-group">
          <label class="adm-form-label">Deals Title:</label>
          <input type="text" class="adm-form-input" value="${section.title || 'Deals of the Day'}" onchange="updateSectionField(${index}, 'title', this.value)">
        </div>
        <div class="adm-form-group">
          <label class="adm-form-label">Timer End (ISO String) / Duration:</label>
          <input type="text" class="adm-form-input" value="${section.timer || ''}" placeholder="e.g. 2026-10-01T00:00:00Z" onchange="updateSectionField(${index}, 'timer', this.value)">
        </div>
      `;
    } else if (section.type === 'circle_categories' || section.type === 'brands_marquee' || section.type === 'square_categories') {
      body.innerHTML = `
        <div class="adm-form-group">
          <label class="adm-form-label">${formatType(section.type)} Items (JSON Array):</label>
          <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 8px;">
            ${section.type === 'brands_marquee' ? 'Example: [{"image":"logo.png","link":"#"}]' : 'Example: [{"image":"cat.jpg","label":"Category Name","link":"#", "bgColor": "#6366f1"}]'}
          </div>
          <textarea class="adm-form-input" rows="4" placeholder="Enter JSON array..." onchange="try{ updateSectionField(${index}, 'items', JSON.parse(this.value)) }catch(e){ alert('Invalid JSON format!') }">${JSON.stringify(section.items || [])}</textarea>
        </div>
      `;
    }

    el.appendChild(body);
    container.appendChild(el);
  });
}

function getIconForType(type) {
  if (type === 'hero') return 'ri-slideshow-line';
  if (type === 'grid') return 'ri-grid-fill';
  if (type === 'deals') return 'ri-timer-flash-line';
  if (type === 'circle_categories') return 'ri-checkbox-blank-circle-line';
  if (type === 'brands_marquee') return 'ri-vip-diamond-line';
  if (type === 'square_categories') return 'ri-layout-grid-fill';
  return 'ri-layout-line';
}

function formatType(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

window.addNewBuilderSection = function() {
  const type = prompt("Enter section type (hero / grid / deals / circle_categories / brands_marquee / square_categories):", "circle_categories");
  if (!type) return;
  const t = type.toLowerCase().trim();
  if (['hero', 'grid', 'deals', 'circle_categories', 'brands_marquee', 'square_categories'].includes(t)) {
    homepageLayout.push({
      type: t,
      title: t === 'hero' ? '' : (t === 'deals' ? 'Deals of the Day' : 'New Collection'),
      items: [],
      id: 'sec_' + Date.now()
    });
    renderBuilderUI();
  } else {
    alert("Invalid type. Choose from the available options.");
  }
}

window.updateSectionField = function(index, field, value) {
  if (homepageLayout[index]) {
    homepageLayout[index][field] = value;
  }
}

window.moveSectionUp = function(index) {
  if (index > 0) {
    const temp = homepageLayout[index - 1];
    homepageLayout[index - 1] = homepageLayout[index];
    homepageLayout[index] = temp;
    renderBuilderUI();
  }
}

window.moveSectionDown = function(index) {
  if (index < homepageLayout.length - 1) {
    const temp = homepageLayout[index + 1];
    homepageLayout[index + 1] = homepageLayout[index];
    homepageLayout[index] = temp;
    renderBuilderUI();
  }
}

window.deleteSection = function(index) {
  if (confirm("Delete this section?")) {
    homepageLayout.splice(index, 1);
    renderBuilderUI();
  }
}

window.saveHomepageLayout = async function() {
  const sb = window.getSupabase();
  if (!sb) return;

  const btn = document.querySelector('#builder .adm-card-header-actions .adm-btn-secondary');
  if(btn) btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';

  try {
    const { error } = await sb.from('site_settings').update({
      homepage_layout: homepageLayout
    }).eq('id', 1);

    if (error) throw error;
    showAdminToast("Homepage layout saved successfully!", "success");
  } catch(e) {
    showAdminToast("Failed to save layout: " + e.message, "error");
  }

  if(btn) btn.innerHTML = '<i class="ri-save-line"></i> Save Layout';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadHomepageBuilder);
} else {
  loadHomepageBuilder();
}
