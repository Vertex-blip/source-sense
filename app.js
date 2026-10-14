/* SourceSense: an intentionally transparent checklist, with no network calls. */
const STORAGE_KEY = 'sourcesense.assessments.v1';
const CRITERIA = [
  ['author', 'Identifiable author', 'Can you identify the writer and their relevant background?'],
  ['origin', 'Original evidence', 'Are primary documents, data, or firsthand accounts linked?'],
  ['citations', 'Traceable claims', 'Can important claims be traced to named, inspectable sources?'],
  ['date', 'Useful date', 'Is a publication or update date visible and relevant?'],
  ['editorial', 'Editorial context', 'Is the publisher’s review or correction process visible?'],
  ['separation', 'News vs. opinion', 'Is reporting clearly separated from opinion or sponsored content?'],
  ['interests', 'Interests disclosed', 'Are funding, affiliations, and possible conflicts made clear?'],
  ['corroboration', 'Independent corroboration', 'Do independent sources support the central claim?']
];
const byId = id => document.getElementById(id);
const form = byId('assessment-form');
let assessments = readSaved();
let currentId = null;
let ratings = Object.fromEntries(CRITERIA.map(([key]) => [key, null]));
let toastTimer;

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(isAssessment).map(normalizeAssessment) : [];
  } catch { return []; }
}

function isAssessment(item) {
  return item && typeof item === 'object' && typeof item.title === 'string' && item.title.trim() && item.ratings && typeof item.ratings === 'object';
}

function normalizeAssessment(item) {
  const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
  return {
    id: text(item.id, 80) || crypto.randomUUID(), title: text(item.title, 160),
    url: text(item.url, 500), publisher: text(item.publisher, 100), author: text(item.author, 100),
    published: text(item.published, 10), topic: text(item.topic, 80), notes: text(item.notes, 3000),
    ratings: Object.fromEntries(CRITERIA.map(([key]) => [key, [0, 1, 2].includes(item.ratings[key]) ? item.ratings[key] : null])),
    updatedAt: Number.isFinite(Date.parse(item.updatedAt)) ? item.updatedAt : new Date().toISOString()
  };
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments)); return true; }
  catch { showToast('Browser storage is unavailable. Export your work before leaving.'); return false; }
}

function showToast(message) {
  const toast = byId('toast'); toast.textContent = message; toast.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
}

function renderCriteria() {
  const list = byId('criteria-list'); list.replaceChildren();
  CRITERIA.forEach(([key, title, prompt], index) => {
    const row = document.createElement('div'); row.className = 'criterion';
    const copy = document.createElement('div');
    const heading = document.createElement('h4'); heading.id = `criterion-${key}`; heading.textContent = `${String(index + 1).padStart(2, '0')}  ${title}`;
    const desc = document.createElement('p'); desc.textContent = prompt; copy.append(heading, desc);
    const group = document.createElement('div'); group.className = 'rating'; group.setAttribute('role', 'group'); group.setAttribute('aria-labelledby', heading.id);
    [0, 1, 2].forEach(value => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = String(value);
      button.setAttribute('aria-label', `${title}: ${value} points`); button.setAttribute('aria-pressed', String(ratings[key] === value));
      button.addEventListener('click', () => {
        ratings[key] = value;
        group.querySelectorAll('button').forEach((option, optionIndex) => option.setAttribute('aria-pressed', String(optionIndex === value)));
        updateScore();
      });
      group.append(button);
    });
    row.append(copy, group); list.append(row);
  });
}

function scoreOf(itemRatings) { return CRITERIA.reduce((total, [key]) => total + (itemRatings[key] ?? 0), 0); }
function answeredOf(itemRatings) { return CRITERIA.filter(([key]) => itemRatings[key] !== null).length; }

function updateScore() {
  const score = scoreOf(ratings), answered = answeredOf(ratings);
  byId('score-value').textContent = String(score);
  byId('answered-count').textContent = String(answered);
  byId('progress-fill').style.width = `${answered / CRITERIA.length * 100}%`;
  byId('score-dial').style.setProperty('--angle', `${score / 16 * 360}deg`);
  const heading = byId('score-heading'), description = byId('score-description');
  if (!answered) { heading.textContent = 'Start with the evidence'; description.textContent = 'Choose a rating for each signal. The score reflects your observations, not whether the claim is true.'; }
  else if (answered < 8) { heading.textContent = 'Review in progress'; description.textContent = `${8 - answered} signal${8 - answered === 1 ? '' : 's'} left to assess. Unrated signals count as zero until you review them.`; }
  else if (score <= 5) { heading.textContent = 'More checking needed'; description.textContent = 'Several credibility signals were not evident. Open original sources and record what you can verify.'; }
  else if (score <= 11) { heading.textContent = 'Mixed signals'; description.textContent = 'Some signals are present. Read your notes and verify the central claim with independent evidence.'; }
  else { heading.textContent = 'Well documented signals'; description.textContent = 'Many credibility signals are visible. This still does not establish that every claim is true.'; }
}

function clearForm() {
  form.reset(); currentId = null; ratings = Object.fromEntries(CRITERIA.map(([key]) => [key, null]));
  byId('form-title').textContent = 'New source review'; byId('save-label').textContent = 'Save assessment';
  renderCriteria(); updateScore();
}

function openAssessment(item) {
  clearForm(); currentId = item.id;
  ['title', 'url', 'publisher', 'author', 'published', 'topic', 'notes'].forEach(key => { byId(key).value = item[key] || ''; });
  ratings = { ...item.ratings }; byId('form-title').textContent = 'Edit source review'; byId('save-label').textContent = 'Update assessment';
  renderCriteria(); updateScore(); byId('workbench').scrollIntoView({ behavior: 'smooth' });
  byId('title').focus({ preventScroll: true });
}

function validateUrl(value) {
  if (!value) return true;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); } catch { return false; }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const title = byId('title').value.trim(), url = byId('url').value.trim();
  if (!title) { byId('title').focus(); showToast('Add a title before saving.'); return; }
  if (!validateUrl(url)) { byId('url').focus(); showToast('Enter a full http:// or https:// link.'); return; }
  if (answeredOf(ratings) !== 8) { showToast('Review all eight signals before saving.'); byId('criteria-list').scrollIntoView({ behavior: 'smooth' }); return; }
  const item = normalizeAssessment({ id: currentId || crypto.randomUUID(), title, url, publisher: byId('publisher').value.trim(), author: byId('author').value.trim(), published: byId('published').value, topic: byId('topic').value.trim(), notes: byId('notes').value.trim(), ratings, updatedAt: new Date().toISOString() });
  const index = assessments.findIndex(saved => saved.id === item.id);
  if (index < 0) assessments.unshift(item); else assessments[index] = item;
  persist(); renderLibrary(); currentId = item.id; byId('form-title').textContent = 'Edit source review'; byId('save-label').textContent = 'Update assessment'; showToast('Assessment saved in this browser.');
});

byId('new-button').addEventListener('click', () => { clearForm(); byId('title').focus(); });
byId('search').addEventListener('input', renderLibrary);

function renderLibrary() {
  const target = byId('library-list'), term = byId('search').value.trim().toLowerCase(); target.replaceChildren();
  const items = assessments.filter(item => [item.title, item.publisher, item.topic, item.author].some(value => value.toLowerCase().includes(term))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!items.length) {
    const empty = document.createElement('div'); empty.className = 'empty-state';
    const heading = document.createElement('strong'); heading.textContent = term ? 'No matching assessments.' : 'Your research library starts here.';
    const copy = document.createElement('p'); copy.textContent = term ? 'Try another search term.' : 'Save your first source review to see it here.';
    empty.append(heading, copy); target.append(empty); return;
  }
  items.forEach(item => {
    const card = document.createElement('article'); card.className = 'library-card';
    const top = document.createElement('div'); top.className = 'library-card-top';
    const label = document.createElement('span'); label.className = 'library-card-label'; label.textContent = item.topic || item.publisher || 'SOURCE REVIEW';
    const badge = document.createElement('span'); badge.className = 'library-card-score'; badge.textContent = `${scoreOf(item.ratings)} / 16`; top.append(label, badge);
    const title = document.createElement('h3'); title.textContent = item.title;
    const meta = document.createElement('p'); meta.textContent = `Updated ${new Date(item.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}${item.author ? ` · ${item.author}` : ''}`;
    const actions = document.createElement('div'); actions.className = 'library-card-actions';
    const open = document.createElement('button'); open.type = 'button'; open.textContent = 'Open review ↗'; open.addEventListener('click', () => openAssessment(item)); actions.append(open);
    if (validateUrl(item.url) && item.url) { const link = document.createElement('a'); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Visit source ↗'; link.style.cssText = 'font-size:11px;font-weight:800;color:#416747'; actions.append(link); }
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete ${item.title}`);
    remove.addEventListener('click', () => { if (!confirm(`Delete “${item.title}”?`)) return; assessments = assessments.filter(saved => saved.id !== item.id); if (currentId === item.id) clearForm(); persist(); renderLibrary(); showToast('Assessment deleted.'); }); actions.append(remove);
    card.append(top, title, meta, actions); target.append(card);
  });
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
byId('export-button').addEventListener('click', () => { downloadJson({ app: 'SourceSense', version: 1, exportedAt: new Date().toISOString(), assessments }, 'sourcesense-backup.json'); showToast('JSON backup downloaded.'); });
byId('import-button').addEventListener('click', () => byId('import-input').click());
byId('import-input').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('File is too large (2 MB maximum).');
    const data = JSON.parse(await file.text());
    if (data.app !== 'SourceSense' || data.version !== 1 || !Array.isArray(data.assessments) || !data.assessments.every(isAssessment)) throw new Error('This is not a valid SourceSense backup.');
    const normalized = data.assessments.map(normalizeAssessment); const existing = new Set(assessments.map(item => item.id));
    normalized.forEach(item => { if (!existing.has(item.id)) { assessments.push(item); existing.add(item.id); } });
    persist(); renderLibrary(); showToast(`${normalized.length} review${normalized.length === 1 ? '' : 's'} read from backup. Existing IDs were kept.`);
  } catch (error) { showToast(error.message || 'Could not import this file.'); }
  event.target.value = '';
});

byId('year').textContent = String(new Date().getFullYear()); renderCriteria(); updateScore(); renderLibrary();
