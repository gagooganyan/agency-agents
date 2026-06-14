'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let allAgents = [];
let filtered = [];
let currentSlug = null;

const PHOTO_KEY = (slug) => `agency_photo_${slug}`;
const COLOR_MAP = {
  cyan: '#06b6d4', blue: '#3b82f6', purple: '#a855f7', pink: '#ec4899',
  red: '#ef4444', orange: '#f97316', yellow: '#eab308', green: '#22c55e',
  teal: '#14b8a6', indigo: '#6366f1', violet: '#8b5cf6', rose: '#f43f5e',
  gray: '#6b7280', slate: '#64748b', emerald: '#10b981', sky: '#0ea5e9',
  lime: '#84cc16', amber: '#f59e0b', fuchsia: '#d946ef',
};

function resolveColor(raw) {
  if (!raw) return '#7c6fff';
  if (raw.startsWith('#')) return raw;
  return COLOR_MAP[raw.toLowerCase()] || '#7c6fff';
}

// ── DOM refs ───────────────────────────────────────────────────────────────
const grid = document.getElementById('grid');
const emptyEl = document.getElementById('empty');
const searchEl = document.getElementById('search');
const categoryFilter = document.getElementById('category-filter');
const photoFilter = document.getElementById('photo-filter');
const agentCount = document.getElementById('agent-count');

const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalAvatar = document.getElementById('modal-avatar');
const modalCategory = document.getElementById('modal-category');
const modalName = document.getElementById('modal-name');
const modalVibe = document.getElementById('modal-vibe');
const modalDescription = document.getElementById('modal-description');
const modalToolsSection = document.getElementById('tools-section');
const toolsList = document.getElementById('tools-list');
const photoPreview = document.getElementById('photo-preview');
const photoPreviewEmoji = document.getElementById('photo-preview-emoji');
const photoUpload = document.getElementById('photo-upload');
const photoRemove = document.getElementById('photo-remove');

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function init() {
  const res = await fetch('agents.json');
  allAgents = await res.json();

  populateCategoryFilter();
  agentCount.textContent = allAgents.length;

  filtered = [...allAgents];
  renderGrid();

  searchEl.addEventListener('input', applyFilters);
  categoryFilter.addEventListener('change', applyFilters);
  photoFilter.addEventListener('change', applyFilters);
  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  photoUpload.addEventListener('change', handlePhotoUpload);
  photoRemove.addEventListener('click', handlePhotoRemove);
}

// ── Category filter options ────────────────────────────────────────────────
function populateCategoryFilter() {
  const cats = [...new Set(allAgents.map(a => a.category))].sort();
  for (const cat of cats) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = formatCategory(cat);
    categoryFilter.appendChild(opt);
  }
}

function formatCategory(slug) {
  return slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// ── Filtering ──────────────────────────────────────────────────────────────
function applyFilters() {
  const q = searchEl.value.toLowerCase().trim();
  const cat = categoryFilter.value;
  const photo = photoFilter.value;

  filtered = allAgents.filter(a => {
    const matchQ = !q ||
      a.name.toLowerCase().includes(q) ||
      a.vibe.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.includes(q);
    const matchCat = !cat || a.category === cat;
    const hasPhoto = !!getStoredPhoto(a.slug);
    const matchPhoto = !photo ||
      (photo === 'with-photo' && hasPhoto) ||
      (photo === 'no-photo' && !hasPhoto);
    return matchQ && matchCat && matchPhoto;
  });

  renderGrid();
}

// ── Render card grid ───────────────────────────────────────────────────────
function renderGrid() {
  grid.innerHTML = '';
  if (filtered.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  for (const agent of filtered) {
    grid.appendChild(buildCard(agent));
  }
}

function buildCard(agent) {
  const color = resolveColor(agent.color);
  const storedPhoto = getStoredPhoto(agent.slug);

  const card = document.createElement('div');
  card.className = 'card';
  card.style.setProperty('--agent-color', color);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Open ${agent.name} agent details`);

  const avatarEl = document.createElement('div');
  avatarEl.className = 'card-top';

  const avatar = document.createElement('div');
  avatar.className = 'card-avatar';
  if (storedPhoto) {
    const img = document.createElement('img');
    img.src = storedPhoto;
    img.alt = agent.name;
    avatar.appendChild(img);
  } else {
    avatar.textContent = agent.emoji || '🤖';
  }

  const info = document.createElement('div');
  info.className = 'card-info';
  info.innerHTML = `
    <div class="card-name">${escHtml(agent.name)}</div>
    <div class="card-category">${escHtml(formatCategory(agent.category))}</div>
  `;

  avatarEl.appendChild(avatar);
  avatarEl.appendChild(info);
  card.appendChild(avatarEl);

  if (agent.vibe) {
    const vibe = document.createElement('div');
    vibe.className = 'card-vibe';
    vibe.textContent = agent.vibe;
    card.appendChild(vibe);
  }

  if (storedPhoto) {
    const badge = document.createElement('span');
    badge.className = 'card-photo-badge';
    badge.textContent = 'PHOTO';
    card.appendChild(badge);
  }

  card.addEventListener('click', () => openModal(agent));
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openModal(agent); });

  return card;
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal(agent) {
  currentSlug = agent.slug;
  const color = resolveColor(agent.color);

  modalAvatar.style.setProperty('--agent-color', color);
  modalCategory.textContent = formatCategory(agent.category);
  modalCategory.style.color = color;
  modalName.textContent = agent.name;
  modalVibe.textContent = agent.vibe || '';
  modalDescription.textContent = agent.description || '';

  modalAvatar.style.setProperty('border-color', color);
  photoPreview.style.setProperty('--agent-color', color);

  if (agent.tools && agent.tools.length > 0) {
    modalToolsSection.classList.remove('hidden');
    toolsList.innerHTML = agent.tools.map(t =>
      `<span class="tool-badge">${escHtml(t)}</span>`
    ).join('');
  } else {
    modalToolsSection.classList.add('hidden');
  }

  refreshModalPhoto(agent);
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function refreshModalPhoto(agent) {
  const color = resolveColor(agent.color);
  const stored = getStoredPhoto(agent.slug);

  modalAvatar.innerHTML = '';
  photoPreview.innerHTML = '';

  if (stored) {
    const imgA = document.createElement('img');
    imgA.src = stored;
    imgA.alt = agent.name;
    modalAvatar.appendChild(imgA);

    const imgP = document.createElement('img');
    imgP.src = stored;
    imgP.alt = agent.name;
    photoPreview.appendChild(imgP);
    photoPreview.classList.add('has-photo');
    photoRemove.style.display = '';
  } else {
    modalAvatar.textContent = agent.emoji || '🤖';
    const emojiEl = document.createElement('span');
    emojiEl.textContent = agent.emoji || '🤖';
    photoPreview.appendChild(emojiEl);
    photoPreview.classList.remove('has-photo');
    photoRemove.style.display = 'none';
  }

  photoUpload.value = '';
}

function closeModal() {
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  currentSlug = null;
}

// ── Photo handling ─────────────────────────────────────────────────────────
function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file || !currentSlug) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    localStorage.setItem(PHOTO_KEY(currentSlug), dataUrl);
    const agent = allAgents.find(a => a.slug === currentSlug);
    if (agent) {
      refreshModalPhoto(agent);
      renderGrid();
    }
  };
  reader.readAsDataURL(file);
}

function handlePhotoRemove() {
  if (!currentSlug) return;
  localStorage.removeItem(PHOTO_KEY(currentSlug));
  const agent = allAgents.find(a => a.slug === currentSlug);
  if (agent) {
    refreshModalPhoto(agent);
    renderGrid();
  }
}

function getStoredPhoto(slug) {
  return localStorage.getItem(PHOTO_KEY(slug)) || null;
}

// ── Utils ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Start ──────────────────────────────────────────────────────────────────
init().catch(console.error);
