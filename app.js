// app.js

const STORAGE_KEY = 'student_planner.classes.v1';
const PROFILE_KEY = 'course_companion.profile.v1';

function loadClasses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse storage, resetting.', e);
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveClasses(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      studentId: (parsed.studentId || '').toString(),
      studentEmail: (parsed.studentEmail || '').toString()
    };
  } catch (e) {
    console.warn('Failed to parse profile; resetting.', e);
    localStorage.removeItem(PROFILE_KEY);
    return { studentId: '', studentEmail: '' };
  }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({
    studentId: (profile.studentId || '').toString(),
    studentEmail: (profile.studentEmail || '').toString()
  }));
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

let state = {
  classes: loadClasses(),
  query: ''
};

// Elements
const form = document.getElementById('class-form');
const idInput = document.getElementById('class-id');
const nameInput = document.getElementById('class-name');
const sectionInput = document.getElementById('section');
const daysTimesInput = document.getElementById('days-times');
const locationInput = document.getElementById('location');
const notesInput = document.getElementById('notes');
const clearBtn = document.getElementById('clear-btn');
const addNewBtn = document.getElementById('add-new-btn');
const searchInput = document.getElementById('search');
const exportBtn = document.getElementById('export-btn');
const importInput = document.getElementById('import-input');
const listEl = document.getElementById('class-list');
const emptyStateEl = document.getElementById('empty-state');
const installBtn = document.getElementById('install-btn');
// Profile elems
const studentIdInput = document.getElementById('student-id');
const studentEmailInput = document.getElementById('student-email');
const languageToggle = document.getElementById('language-toggle');

// i18n helper
function t(key) {
  try {
    return (translations?.[currentLanguage]?.[key]) ?? key;
  } catch {
    return key;
  }
}


function setBusy(isBusy) {
  listEl.setAttribute('aria-busy', isBusy ? 'true' : 'false');
}

function clearForm() {
  form.reset();
  idInput.value = '';
  nameInput.focus();
}

function validate() {
  if (!nameInput.value.trim()) {
    nameInput.focus();
    return false;
  }
  return true;
}

function toItemFromForm() {
  return {
    id: idInput.value || uid(),
    name: nameInput.value.trim(),
    section: sectionInput.value.trim(),
    daysTimes: daysTimesInput.value.trim(),
    location: locationInput.value.trim(),
    notes: notesInput.value.trim(),
  };
}

function fillForm(item) {
  idInput.value = item.id;
  nameInput.value = item.name || '';
  sectionInput.value = item.section || '';
  daysTimesInput.value = item.daysTimes || '';
  locationInput.value = item.location || '';
  notesInput.value = item.notes || '';
  nameInput.focus();
}

function upsertItem(item) {
  const idx = state.classes.findIndex(c => c.id === item.id);
  if (idx >= 0) {
    state.classes[idx] = item;
  } else {
    state.classes.push(item);
  }
  saveClasses(state.classes);
  renderList();
}

function deleteItem(id) {
  state.classes = state.classes.filter(c => c.id !== id);
  saveClasses(state.classes);
  renderList();
}

function moveItem(id, direction) {
  const idx = state.classes.findIndex(c => c.id === id);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= state.classes.length) return;
  const [item] = state.classes.splice(idx, 1);
  state.classes.splice(newIdx, 0, item);
  saveClasses(state.classes);
  renderList();
}

function getFilteredClasses() {
  const q = state.query.trim().toLowerCase();
  if (!q) return state.classes;
  return state.classes.filter((c) => {
    return [c.name, c.section, c.daysTimes, c.location, c.notes]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q));
  });
}

function renderList() {
  setBusy(true);
  listEl.innerHTML = '';

  const items = getFilteredClasses();

  if (!items.length) {
    emptyStateEl.style.display = 'block';
    setBusy(false);
    return;
  }
  emptyStateEl.style.display = 'none';

  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.setAttribute('data-id', item.id);

    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = [
      item.name,
      item.section ? `(${t('section')} ${item.section})` : ''
    ].filter(Boolean).join(' ');

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = [item.daysTimes, item.location].filter(Boolean).join(' • ');

    const notes = document.createElement('div');
    if (item.notes) {
      notes.className = 'item-notes';
      notes.textContent = item.notes;
    }

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn';
    editBtn.type = 'button';
    editBtn.textContent = t('edit');
    editBtn.addEventListener('click', () => fillForm(item));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn';
    delBtn.type = 'button';
    delBtn.textContent = t('delete');
    delBtn.addEventListener('click', () => {
      if (confirm(t('confirmDelete'))) deleteItem(item.id);
    });

    const upBtn = document.createElement('button');
    upBtn.className = 'btn';
    upBtn.type = 'button';
    upBtn.textContent = t('moveUp');
    upBtn.addEventListener('click', () => moveItem(item.id, -1));

    const downBtn = document.createElement('button');
    downBtn.className = 'btn';
    downBtn.type = 'button';
    downBtn.textContent = t('moveDown');
    downBtn.addEventListener('click', () => moveItem(item.id, +1));

    actions.append(editBtn, delBtn, upBtn, downBtn);

    li.append(title, meta);
    if (item.notes) li.append(notes);
    li.append(actions);

    listEl.appendChild(li);
  }

  setBusy(false);
}

// Export / Import
function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    classes: state.classes
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `student-planner-backup-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const arr = parsed && Array.isArray(parsed.classes) ? parsed.classes : (Array.isArray(parsed) ? parsed : null);
      if (!arr) throw new Error('Invalid format');
      if (!confirm(t('importReplaceConfirm'))) return;
      // Basic validation and normalization
      const cleaned = arr.map((c) => ({
        id: c.id || uid(),
        name: (c.name || '').toString(),
        section: (c.section || '').toString(),
        daysTimes: (c.daysTimes || '').toString(),
        location: (c.location || '').toString(),
        notes: (c.notes || '').toString()
      })).filter(c => c.name.trim());
      state.classes = cleaned;
      saveClasses(state.classes);
      renderList();
      alert(t('importComplete'));
    } catch (e) {
      alert(t('importFailed'));
      console.error(e);
    } finally {
      importInput.value = '';
    }
  };
  reader.readAsText(file);
}

// Form events
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validate()) return;
  const item = toItemFromForm();
  upsertItem(item);
  // Ensure the new/edited item is visible even if a search filter was active
  if (searchInput && state.query) {
    state.query = '';
    searchInput.value = '';
    renderList();
  }
  console.log('[Classes] Saved', item);
  clearForm();
});

clearBtn.addEventListener('click', clearForm);
addNewBtn.addEventListener('click', clearForm);

// Search events (debounced)
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = searchInput.value || '';
    renderList();
  }, 120);
});

// Export / Import events
exportBtn.addEventListener('click', exportData);
importInput.addEventListener('change', (e) => importData(e.target.files[0]));

// Initial render
renderList();

// Language switcher
let currentLanguage = localStorage.getItem('language') || 'en';

function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('language', lang);
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-key]').forEach(element => {
    const key = element.getAttribute('data-key');
    if (translations[lang] && translations[lang][key]) {
      if (element.placeholder) {
        element.placeholder = translations[lang][key];
      } else {
        element.textContent = translations[lang][key];
      }
    }
  });

  languageToggle.textContent = lang === 'en' ? 'Español' : 'English';
  // Re-render dynamic content that isn't data-key driven
  renderList();
}

languageToggle.addEventListener('click', () => {
  const newLang = currentLanguage === 'en' ? 'es' : 'en';
  setLanguage(newLang);
});

// Set initial language
setLanguage(currentLanguage);

// Initialize and persist profile
const profileState = loadProfile();
if (studentIdInput) studentIdInput.value = profileState.studentId || '';
if (studentEmailInput) studentEmailInput.value = profileState.studentEmail || '';

let profileTimer;
function scheduleProfileSave() {
  clearTimeout(profileTimer);
  profileTimer = setTimeout(() => {
    const next = {
      studentId: (studentIdInput?.value || '').trim(),
      studentEmail: (studentEmailInput?.value || '').trim()
    };
    saveProfile(next);
  }, 300);
}

studentIdInput?.addEventListener('input', scheduleProfileSave);
studentEmailInput?.addEventListener('input', scheduleProfileSave);

// PWA: register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(err => {
      console.warn('SW registration failed', err);
    });
  });
}

// PWA: custom install prompt
let deferredPrompt = null;

function isIos() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function setupInstallButton() {
  if (!installBtn) return;

  // 1. Check if already standalone, if so, do nothing.
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) {
    installBtn.hidden = true;
    return;
  }

  // 2. Check for iOS Safari
  if (isIos()) {
    // On iOS, the 'beforeinstallprompt' event is not supported.
    // We just show the button and explain how to 'Add to Home Screen'.
    installBtn.hidden = false;
    installBtn.addEventListener('click', () => {
      alert(t('installIosHint'));
    });
    return;
  }

  // 3. Standard PWA prompt for other browsers (e.g., Chrome on Android)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false; // Show the button if the browser supports the prompt.
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    try {
      installBtn.disabled = true;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      // The 'appinstalled' event will hide the button if successful.
    } catch (err) {
      console.warn('Install prompt error:', err);
    } finally {
      installBtn.disabled = false;
      deferredPrompt = null;
      // Hide it anyway, as the prompt can only be used once.
      installBtn.hidden = true;
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installBtn.hidden = true;
  });
}

window.addEventListener('DOMContentLoaded', setupInstallButton);
console.log('app.js module loaded');
