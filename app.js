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

// Scan/OCR elements
const scanInput = document.getElementById('scan-input');
const scanPreviewWrap = document.getElementById('scan-preview-wrap');
const scanPreview = document.getElementById('scan-preview');
const scanToProfileBtn = document.getElementById('scan-to-profile-btn');
const scanToClassBtn = document.getElementById('scan-to-class-btn');
const scanStatus = document.getElementById('scan-status');

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
    title.textContent = [item.name, item.section ? `(Section ${item.section})` : ''].filter(Boolean).join(' ');

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
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => fillForm(item));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn';
    delBtn.type = 'button';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      if (confirm('Delete this class?')) deleteItem(item.id);
    });

    const upBtn = document.createElement('button');
    upBtn.className = 'btn';
    upBtn.type = 'button';
    upBtn.textContent = 'Move up';
    upBtn.addEventListener('click', () => moveItem(item.id, -1));

    const downBtn = document.createElement('button');
    downBtn.className = 'btn';
    downBtn.type = 'button';
    downBtn.textContent = 'Move down';
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
      if (!confirm('Import will replace your current classes. Continue?')) return;
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
      alert('Import complete.');
    } catch (e) {
      alert('Failed to import JSON.');
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

function updateInstallBtnVisibility() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) {
    if (installBtn) installBtn.hidden = true;
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});

installBtn?.addEventListener('click', async () => {
  try {
    if (!deferredPrompt) return;
    installBtn.disabled = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
  } catch (_) {
    // ignore
  } finally {
    deferredPrompt = null;
    if (installBtn) {
      installBtn.disabled = false;
      installBtn.hidden = true;
    }
  }
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  if (installBtn) installBtn.hidden = true;
});

window.addEventListener('DOMContentLoaded', updateInstallBtnVisibility);
window.matchMedia('(display-mode: standalone)')?.addEventListener?.('change', updateInstallBtnVisibility);
console.log('[OCR] app.js module loaded');

// OCR functions
function setScanStatus(msg) {
  if (scanStatus) scanStatus.textContent = msg || '';
}

let selectedImageBlob = null;

function showPreview(file) {
  const url = URL.createObjectURL(file);
  scanPreview.src = url;
  scanPreviewWrap.hidden = false;
}

async function resizeImage(file, maxDim = 1200) {
  const img = document.createElement('img');
  const url = URL.createObjectURL(file);
  try {
    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = (e) => rej(e);
      img.src = url;
    });
    const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    return blob || file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Singleton OCR worker (initialized once and reused)
let _ocrWorkerPromise = null;
async function getOcrWorker() {
  if (_ocrWorkerPromise) return _ocrWorkerPromise;
  _ocrWorkerPromise = (async () => {
    setScanStatus('Loading OCR engine…');
    let mod;
    try {
      mod = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js');
    } catch (e) {
      console.error('Failed to load Tesseract.js', e);
      setScanStatus('Failed to load OCR engine. Check connection and try again.');
      throw e;
    }
    let createWorkerFn = mod.createWorker || mod.default?.createWorker || mod.Tesseract?.createWorker;
    if (!createWorkerFn) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('Failed to load Tesseract UMD'));
        document.head.appendChild(s);
      });
      createWorkerFn = window.Tesseract?.createWorker;
    }
    if (!createWorkerFn) throw new Error('Tesseract createWorker not available');

    const logger = (m) => {
      if (!m) return;
      if (typeof m.progress === 'number' && m.status) {
        const pct = Math.round(m.progress * 100);
        setScanStatus(`${m.status}… ${pct}%`);
      }
    };

    const createPromise = createWorkerFn('eng', {
      logger,
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    });

    const worker = await Promise.race([
      createPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('OCR engine load timed out')), 25000))
    ]);

    try { await worker.setParameters?.({ tessedit_pageseg_mode: 6 }); } catch (_) {}
    setScanStatus('OCR ready');
    return worker;
  })();
  return _ocrWorkerPromise;
}

async function ocrImage(blob) {
  const worker = await getOcrWorker();
  try {
    setScanStatus('Extracting text…');
    const { data: { text } } = await worker.recognize(blob).catch((e) => {
      console.error('[OCR] recognize() failed', e);
      setScanStatus('OCR failed reading the image. Try a sharper, higher-contrast photo.');
      throw e;
    });
    console.log('[OCR] Text length:', (text || '').length);
    if (text) console.log('[OCR] Sample:', text.slice(0, 120).replace(/\n/g, ' ↵ '));
    return (text || '').trim();
  } catch (e) {
    throw e;
  }
}

function parseStudentInfo(text) {
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const idMatch = text.match(/\b([A-Za-z]?[0-9]{6,10}|[A-Za-z][A-Za-z0-9]{6,12})\b/);
  return {
    studentId: idMatch ? idMatch[0] : '',
    studentEmail: emailMatch ? emailMatch[0] : ''
  };
}

function parseClassInfo(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const name = (lines.find(l => /\b[A-Z]{2,5}\s?-?\d{2,4}\b/.test(l)) || lines[0] || '').trim();
  const section = (text.match(/\b(?:Section|Sec)[:\s-]*([A-Za-z0-9]{1,6})\b/i) || [,''])[1];
  const daysPattern = /(Mon|Tue|Tues|Wed|Thu|Thur|Fri|Sat|Sun|MWF|TR|MTWThF|Mon\/?Wed\/?Fri|Tue\/?Thu)/i;
  const timePattern = /((1[0-2]|0?[1-9]):[0-5]\d\s?(AM|PM))\s?(?:[-–—]\s?((1[0-2]|0?[1-9]):[0-5]\d\s?(AM|PM)))?/i;
  const daysTimesLine = lines.find(l => daysPattern.test(l) || timePattern.test(l)) || '';
  const location = (text.match(/\b(Room|Rm\.?|Hall|Building|Bldg\.?|Lab|Auditorium)\b[^\n]*/i) || [,''])[1]
    ? (text.match(/\b(Room|Rm\.?|Hall|Building|Bldg\.?|Lab|Auditorium)\b[^\n]*/i)[0])
    : '';
  return { name, section, daysTimes: daysTimesLine, location, notes: '' };
}

async function extractTo(target) {
  try {
    if (!selectedImageBlob) {
      setScanStatus('No photo selected. Choose a photo above.');
      alert('Please choose a photo first.');
      return;
    }
    setScanStatus('Preparing image…');
    const blob = await resizeImage(selectedImageBlob, 1200);
    const text = await ocrImage(blob);
    if (!text) {
      setScanStatus('No text detected. Try a clearer photo.');
      return;
    }
    if (target === 'profile') {
      const p = parseStudentInfo(text);
      if (studentIdInput) studentIdInput.value = p.studentId || '';
      if (studentEmailInput) studentEmailInput.value = p.studentEmail || '';
      scheduleProfileSave();
      setScanStatus('Filled Student Info from photo.');
    } else if (target === 'class') {
      const c = parseClassInfo(text);
      nameInput.value = c.name || '';
      sectionInput.value = c.section || '';
      daysTimesInput.value = c.daysTimes || '';
      locationInput.value = c.location || '';
      notesInput.value = c.notes || '';
      setScanStatus('Filled class form from photo. Review and Save.');
    }
  } catch (e) {
    console.error(e);
    const current = (scanStatus?.textContent || '').trim();
    if (!current || !/^Failed to load OCR engine|No text detected/i.test(current)) {
      setScanStatus(`Failed to extract. ${e?.message ? '(' + e.message + ')' : 'Try retaking the photo with better lighting.'}`);
    }
  }
}

scanInput?.addEventListener('change', () => {
  const f = scanInput.files && scanInput.files[0];
  if (!f) return;
  selectedImageBlob = f;
  showPreview(f);
  setScanStatus('Photo ready. Choose where to extract.');
});

scanToProfileBtn?.addEventListener('click', () => { setScanStatus('Starting extraction…'); extractTo('profile'); });
scanToClassBtn?.addEventListener('click', () => { setScanStatus('Starting extraction…'); extractTo('class'); });

// Warm up OCR in the background after DOM is ready (improves first-click latency)
window.addEventListener('DOMContentLoaded', () => {
  getOcrWorker().catch((e) => console.warn('[OCR] Warmup failed', e));
});

// Bind again when DOM is fully ready, in case module executed before nodes were parsed in some environments
window.addEventListener('DOMContentLoaded', () => {
  const profileBtn = document.getElementById('scan-to-profile-btn');
  const classBtn = document.getElementById('scan-to-class-btn');
  const inputEl = document.getElementById('scan-input');
  console.log('[OCR] DOM ready. Wiring scan controls.');
  if (inputEl && !inputEl.__bound) {
    inputEl.addEventListener('change', () => {
      const f = inputEl.files && inputEl.files[0];
      if (!f) return;
      selectedImageBlob = f;
      showPreview(f);
      setScanStatus('Photo ready. Choose where to extract.');
    });
    inputEl.__bound = true;
  }
  if (profileBtn && !profileBtn.__bound) {
    const handler = () => { console.log('[OCR] Profile extract clicked'); setScanStatus('Starting extraction…'); extractTo('profile'); };
    profileBtn.addEventListener('click', handler);
    profileBtn.onclick = handler; // direct fallback
    profileBtn.__bound = true;
  }
  if (classBtn && !classBtn.__bound) {
    const handler = () => { console.log('[OCR] Class extract clicked'); setScanStatus('Starting extraction…'); extractTo('class'); };
    classBtn.addEventListener('click', handler);
    classBtn.onclick = handler; // direct fallback
    classBtn.__bound = true;
  }
});

// Delegated fallback (defensive): works even if direct bindings failed
document.addEventListener('click', (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.id === 'scan-to-profile-btn') {
    console.log('[OCR] Delegated: profile');
    setScanStatus('Starting extraction…');
    extractTo('profile');
  } else if (t.id === 'scan-to-class-btn') {
    console.log('[OCR] Delegated: class');
    setScanStatus('Starting extraction…');
    extractTo('class');
  }
});

// Debug handle to test from console
try {
  window._ocrDebug = {
    extractTo,
    setScanStatus,
    version: 'v1',
  };
  console.log('[OCR] Debug handle attached: window._ocrDebug');
} catch (_) {}
