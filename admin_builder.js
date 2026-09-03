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

  let draggedIndex = null;

  homepageLayout.forEach((section, index) => {
    const el = document.createElement('div');
    el.className = 'adm-builder-section';
    el.style.border = '1px solid var(--adm-border)';
    el.style.borderRadius = 'var(--adm-radius-md)';
    el.style.padding = '16px';
    el.style.background = '#f8fafc';
    el.style.marginBottom = '12px';
    el.style.cursor = 'grab';
    el.draggable = true;

    // Drag events
    el.addEventListener('dragstart', (e) => {
      draggedIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      el.style.opacity = '0.5';
    });
    
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.style.border = '2px dashed var(--adm-primary)';
    });
    
    el.addEventListener('dragleave', () => {
      el.style.border = '1px solid var(--adm-border)';
    });
    
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.style.border = '1px solid var(--adm-border)';
      if (draggedIndex !== null && draggedIndex !== index) {
        // Move array item
        const movedItem = homepageLayout.splice(draggedIndex, 1)[0];
        homepageLayout.splice(index, 0, movedItem);
        renderBuilderUI();
      }
    });

    el.addEventListener('dragend', () => {
      el.style.opacity = '1';
      draggedIndex = null;
    });

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '12px';
    header.innerHTML = `
      <div style="font-weight: 800; color: var(--adm-text-main); font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
        <i class="ri-draggable" style="color: #94a3b8; cursor: grab; font-size: 1.2rem;"></i>
        <i class="${getIconForType(section.type)}" style="color: var(--adm-primary);"></i>
        ${formatType(section.type)} Section
      </div>
      <div style="display: flex; gap: 6px;">
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
      const isBrands = section.type === 'brands_marquee';
      let itemsHtml = (section.items || []).map((item, itemIdx) => `
        <div style="border: 1px solid var(--adm-border); border-radius: 6px; padding: 10px; margin-bottom: 8px; background: #fff; position: relative;">
          <button onclick="removeSectionItem(${index}, ${itemIdx})" style="position: absolute; right: 8px; top: 8px; background: none; border: none; color: #ef4444; cursor: pointer;"><i class="ri-close-circle-fill"></i></button>
          
          <div style="display: grid; grid-template-columns: 60px 1fr; gap: 12px; align-items: center;">
            <div style="width: 60px; height: 60px; border-radius: ${isBrands ? '4px' : '50%'}; overflow: hidden; background: #f1f5f9; border: 1px solid var(--adm-border);">
              <img src="${item.image || ''}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${!isBrands ? `<input type="text" class="adm-form-input" style="padding: 4px 8px; font-size: 0.8rem;" placeholder="Title (e.g. Kurtis)" value="${item.label || ''}" onchange="updateSectionItem(${index}, ${itemIdx}, 'label', this.value)">` : ''}
              <input type="text" class="adm-form-input" style="padding: 4px 8px; font-size: 0.8rem;" placeholder="Image URL" value="${item.image || ''}" onchange="updateSectionItem(${index}, ${itemIdx}, 'image', this.value)">
              <input type="text" class="adm-form-input" style="padding: 4px 8px; font-size: 0.8rem;" placeholder="Link (Optional)" value="${item.link || '#'}" onchange="updateSectionItem(${index}, ${itemIdx}, 'link', this.value)">
            </div>
          </div>
        </div>
      `).join('');

      body.innerHTML = `
        <div class="adm-form-group">
          <label class="adm-form-label">${formatType(section.type)} Items:</label>
          <div id="section-items-${index}">
            ${itemsHtml}
          </div>
          <button class="adm-btn-secondary" onclick="addSectionItem(${index})" style="width: 100%; justify-content: center; border-style: dashed; margin-top: 8px;">
            <i class="ri-add-line"></i> Add Item
          </button>
        </div>
      `;
    }

    el.appendChild(body);
    container.appendChild(el);
  });

  // Sync Live Preview
  const previewFrame = document.getElementById('builderPreviewFrame');
  if (previewFrame && previewFrame.contentWindow) {
    previewFrame.contentWindow.postMessage({ type: 'LIVE_PREVIEW_UPDATE', layout: homepageLayout }, '*');
  }
}

window.addSectionItem = function(index) {
  if (homepageLayout[index]) {
    if (!homepageLayout[index].items) homepageLayout[index].items = [];
    homepageLayout[index].items.push({ image: '', label: '', link: '#' });
    renderBuilderUI();
  }
}

window.removeSectionItem = function(index, itemIdx) {
  if (homepageLayout[index] && homepageLayout[index].items) {
    homepageLayout[index].items.splice(itemIdx, 1);
    renderBuilderUI();
  }
}

window.updateSectionItem = function(index, itemIdx, field, value) {
  if (homepageLayout[index] && homepageLayout[index].items && homepageLayout[index].items[itemIdx]) {
    homepageLayout[index].items[itemIdx][field] = value;
    renderBuilderUI(); // Re-render to update preview
  }
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

window.openSectionModal = function() {
  const modal = document.getElementById('builderSectionModal');
  if(modal) modal.style.display = 'flex';
}

window.closeSectionModal = function() {
  const modal = document.getElementById('builderSectionModal');
  if(modal) modal.style.display = 'none';
}

window.addSectionOfType = function(type) {
  const t = type.toLowerCase().trim();
  homepageLayout.push({
    type: t,
    title: t === 'hero' ? '' : (t === 'deals' ? 'Deals of the Day' : 'New Collection'),
    items: [],
    id: 'sec_' + Date.now()
  });
  renderBuilderUI();
  closeSectionModal();
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
