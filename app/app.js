// Vice City Trophy Guide — offline tracker for GTA VI's 55 PS5 trophies.
// Loads app/data/trophies.json, renders the roadmap and the checklist,
// saves progress in localStorage, and exports/imports it as a file.
const STORAGE_KEY = 'gta6-trophy-guide-v1';
const DEMO_EARNED = [2, 3, 8, 16, 20, 21, 32, 35];

const KIND_LABELS = {
  all: 'All', story: 'Story', missable: 'Missable', collectible: 'Collectibles',
  activity: 'Activities', combat: 'Combat & robbery', world: 'World',
  money: 'Money', online: 'Online', platinum: 'Platinum',
};
const KIND_ORDER = ['all', 'story', 'missable', 'collectible', 'activity', 'combat', 'world', 'money', 'online', 'platinum'];

const ROADMAP = [
  {
    stage: 1,
    title: 'Play the story',
    text: 'Chapters 1–4 and the final mission. Twelve trophies pop as you play; none can be missed. Keep a manual save at the start of every chapter and one before the final mission — there is no mission replay and no New Game Plus. Do Lucia’s balcony meditation in Chapter 1 (Positive Mental Attitude) before the chapter ends.',
  },
  {
    stage: 2,
    title: 'Strangers & side stories',
    text: 'The five side-character finales (Andy, Kenton, Billy, Randy, Tyrone) plus Bret’s hunt and the 8 stranger strands. Finales stay open after the story. Andy’s, Billy’s and Tyrone’s strands do NOT count toward Strangers & Freaks. Race Against Yago (Chapter 3) is time-sensitive — save first.',
  },
  {
    stage: 3,
    title: 'Activities',
    text: 'The activity grind: 250 stunts (300 for 100%), 42 shooting-range golds, 14 drone-race locations, 20 races, fishing vs Cal, arcade games, 18 meditation spots, 50 challenges (70 of 80 for 100%), and maximum Strength for both characters. Meditation is the one time-sensitive piece — see stage 1.',
  },
  {
    stage: 4,
    title: 'Robberies & combat',
    text: 'The tools arrive in Chapters 3–4: the Snap Gun from Yasmani’s Jewelry Jobs (Sneakthief) and bank vaults from That’s Where The Money Is (end of Chapter 4). Bring your partner for vaults — you cannot carry all the bags alone, and escaping with your partner also earns Hot Together.',
  },
  {
    stage: 5,
    title: 'Collectibles & the world',
    text: '3 card sets, 100 WAiNK locations, 100 vehicles (scan them with the WAiNK app), all 52 areas of Leonida, plus the one-off world moments. Five trophies here have no confirmed method yet at launch (In The Beginning…, Capital Offense, Bad Luck, I Guess, The Truth Is Out There, Ten Pin) — check the linked sources for updates.',
  },
  {
    stage: 6,
    title: 'Money & the platinum',
    text: 'Launder $250,000 in marked bills, spend $100,000, buy all 8 garages (about $160,000), register 10 vehicles. Then open Progress > Stats > 100% Completion (it appears after the story) and finish its 35 tasks — the platinum pops with A Long Road.',
  },
];

let trophies = [];
let earned = new Set(loadProgress());
let kindFilter = 'all';
let gradeFilter = 'all';
let spoilerOn = false;
let earnedOnly = false;
let query = '';

async function loadTrophies() {
  const response = await fetch('data/trophies.json');
  const doc = await response.json();
  return doc.trophies;
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function kindLabel(kind) {
  return KIND_LABELS[kind] ?? kind;
}

function countText(trophy) {
  if (trophy.count == null) return '';
  if (trophy.id === 52) return 'Target: $250,000 laundered';
  if (trophy.id === 53) return 'Target: $100,000 spent';
  return 'Target: ' + trophy.count;
}

function sourceLink(source) {
  if (!source.url) return document.createTextNode(source.name);
  const a = document.createElement('a');
  a.href = source.url;
  a.textContent = source.name;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function trophyCard(trophy) {
  const isEarned = earned.has(trophy.id);
  const article = document.createElement('article');
  article.className = 'card' + (isEarned ? ' earned' : '');
  article.id = 'trophy-' + trophy.id;
  if (trophy.story && spoilerOn && !isEarned) article.classList.add('spoiled');

  const top = document.createElement('div');
  top.className = 'card-top';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.setAttribute('aria-label', 'Mark ' + trophy.name + ' earned');
  box.addEventListener('change', () => {
    if (box.checked) earned.add(trophy.id);
    else earned.delete(trophy.id);
    saveProgress();
    renderAll();
  });
  top.append(box);

  const head = document.createElement('div');
  const name = document.createElement('h3');
  name.className = 'card-name';
  name.textContent = trophy.name + (isEarned ? ' ✓' : '');
  head.append(name);
  const desc = document.createElement('p');
  desc.className = 'card-desc';
  desc.textContent = '“' + trophy.description + '”';
  head.append(desc);
  top.append(head);
  article.append(top);

  const badges = document.createElement('div');
  badges.className = 'badges';
  const grade = document.createElement('span');
  grade.className = 'badge ' + trophy.grade;
  grade.textContent = gradeLabel(trophy.grade);
  badges.append(grade);
  const kind = document.createElement('span');
  kind.className = 'badge';
  kind.textContent = kindLabel(trophy.kind);
  badges.append(kind);
  if (trophy.hidden) {
    const hidden = document.createElement('span');
    hidden.className = 'badge hidden-badge';
    hidden.textContent = 'Hidden on PS5';
    badges.append(hidden);
  }
  if (trophy.missable) {
    const miss = document.createElement('span');
    miss.className = 'badge missable';
    miss.textContent = '⚠ Possibly missable';
    badges.append(miss);
  }
  if (trophy.unconfirmed) {
    const unc = document.createElement('span');
    unconfirmedBadge(unc);
    badges.append(unc);
  }
  article.append(badges);

  const spoilerNote = document.createElement('p');
  spoilerNote.className = 'spoiler-note';
  spoilerNote.textContent = 'Hidden story trophy — earn it to reveal its name, description and guide.';
  article.append(spoilerNote);

  const guide = document.createElement('div');
  guide.className = 'card-guide';
  const guideText = document.createElement('p');
  guideText.textContent = trophy.guide;
  guide.append(guideText);
  if (trophy.count != null) {
    const count = document.createElement('p');
    count.className = 'card-count';
    count.textContent = countText(trophy);
    guide.append(count);
  }
  if (trophy.missable && trophy.missable_note) {
    const note = document.createElement('p');
    note.className = 'missable-note';
    note.textContent = 'Missable warning: ' + trophy.missable_note;
    guide.append(note);
  }
  if (trophy.steps && trophy.steps.length) {
    const steps = document.createElement('ol');
    steps.className = 'card-steps';
    for (const step of trophy.steps) {
      const li = document.createElement('li');
      li.textContent = step;
      steps.append(li);
    }
    guide.append(steps);
  }
  article.append(guide);

  const sources = document.createElement('p');
  sources.className = 'card-sources';
  sources.append(document.createTextNode('Sources: '));
  for (const source of trophy.sources) {
    sources.append(sourceLink(source));
    sources.append(document.createTextNode(' '));
  }
  article.append(sources);
  return article;
}

function unconfirmedBadge(badge) {
  badge.className = 'badge unconfirmed';
  badge.textContent = 'Method unconfirmed';
}

function matchesFilters(trophy) {
  if (earnedOnly && !earned.has(trophy.id)) return false;
  if (gradeFilter !== 'all' && trophy.grade !== gradeFilter) return false;
  if (kindFilter === 'missable' && !trophy.missable) return false;
  if (kindFilter === 'online') return false;
  if (kindFilter !== 'all' && kindFilter !== 'missable' && kindFilter !== 'online' && trophy.kind !== kindFilter) return false;
  if (query) {
    const hay = (trophy.name + ' ' + trophy.description + ' ' + trophy.guide + ' ' + trophy.kind).toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progressText').textContent = done + ' of ' + total + ' earned';
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
  const byGrade = {};
  for (const t of trophies) {
    if (!earned.has(t.id)) continue;
    byGrade[t.grade] = (byGrade[t.grade] ?? 0) + 1;
  }
  const totals = {};
  for (const t of trophies) totals[t.grade] = (totals[t.grade] ?? 0) + 1;
  document.getElementById('progressGrades').textContent =
    ['platinum', 'gold', 'silver', 'bronze']
      .map((g) => gradeLabel(g) + ' ' + (byGrade[g] ?? 0) + '/' + (totals[g] ?? 0))
      .join(' · ');
}

function renderRoadmap() {
  const list = document.getElementById('roadmapStages');
  list.replaceChildren();
  for (const stage of ROADMAP) {
    const li = document.createElement('li');
    const title = document.createElement('h3');
    title.innerHTML = '';
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = 'Stage ' + stage.stage;
    title.append(num, document.createTextNode(stage.title));
    li.append(title);
    const text = document.createElement('p');
    text.textContent = stage.text;
    li.append(text);
    const chips = document.createElement('div');
    chips.className = 'stage-trophies';
    for (const trophy of trophies.filter((t) => t.stage === stage.stage)) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = trophy.name;
      if (earned.has(trophy.id)) chip.classList.add('earned');
      chip.addEventListener('click', () => {
        document.getElementById('trophy-' + trophy.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      chips.append(chip);
    }
    li.append(chips);
    list.append(li);
  }
}

function renderList() {
  const list = document.getElementById('trophyList');
  list.replaceChildren();
  const shown = trophies
    .filter(matchesFilters)
    .sort((a, b) => a.stage - b.stage || a.id - b.id);
  for (const trophy of shown) list.append(trophyCard(trophy));
  const count = document.getElementById('listCount');
  if (kindFilter === 'online') {
    count.textContent = 'No online trophies — every trophy is single-player. GTA VI launches without an online mode, so nothing here needs another player or a server.';
  } else {
    count.textContent = 'Showing ' + shown.length + ' of ' + trophies.length + ' trophies' +
      (kindFilter !== 'all' ? ' · kind: ' + kindLabel(kindFilter) : '') +
      (gradeFilter !== 'all' ? ' · grade: ' + gradeLabel(gradeFilter) : '') +
      (query ? ' · search: “' + query + '”' : '') + '.';
  }
  document.getElementById('emptyState').hidden = shown.length > 0 || kindFilter === 'online';
}

function renderChips() {
  const wrap = document.getElementById('kindChips');
  wrap.replaceChildren();
  for (const kind of KIND_ORDER) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = KIND_LABELS[kind];
    chip.setAttribute('aria-pressed', String(kindFilter === kind));
    chip.addEventListener('click', () => {
      kindFilter = kind;
      renderAll();
    });
    wrap.append(chip);
  }
}

function renderSources() {
  const seen = new Map();
  for (const trophy of trophies) {
    for (const source of trophy.sources) {
      if (source.url && !seen.has(source.url)) seen.set(source.url, source.name);
    }
  }
  const wrap = document.getElementById('sourceList');
  wrap.replaceChildren();
  for (const [url, name] of seen) {
    const a = document.createElement('a');
    a.href = url;
    a.textContent = name;
    a.target = '_blank';
    a.rel = 'noopener';
    wrap.append(a);
  }
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderList();
  renderChips();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify([...earned].sort((a, b) => a - b), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = new Set(trophies.map((t) => t.id));
    earned = new Set(data.filter((id) => ids.has(id)));
    saveProgress();
    renderAll();
  } catch {
    alert('That file is not a valid progress export.');
  }
}

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1') {
    earned = new Set(DEMO_EARNED);
    saveProgress();
  }
  if (params.get('filter') && KIND_LABELS[params.get('filter')]) kindFilter = params.get('filter');
  if (params.get('grade')) gradeFilter = params.get('grade');
  if (params.get('search')) {
    query = params.get('search').toLowerCase();
    document.getElementById('search').value = params.get('search');
  }
  if (params.get('spoiler') === '1') {
    spoilerOn = true;
    document.getElementById('spoilerToggle').checked = true;
  }
  return params;
}

function applyUrlScroll(params) {
  if (params.get('view') === 'roadmap') {
    document.getElementById('roadmap').scrollIntoView();
    return;
  }
  const trophyId = Number(params.get('trophy'));
  if (trophyId) {
    const card = document.getElementById('trophy-' + trophyId);
    if (card) {
      card.scrollIntoView({ block: 'center' });
      card.classList.add('flash');
    }
  }
}

function initControls() {
  document.getElementById('search').addEventListener('input', (event) => {
    query = event.target.value.trim().toLowerCase();
    renderList();
  });
  document.getElementById('gradeFilter').addEventListener('change', (event) => {
    gradeFilter = event.target.value;
    renderList();
  });
  document.getElementById('spoilerToggle').addEventListener('change', (event) => {
    spoilerOn = event.target.checked;
    renderList();
  });
  document.getElementById('earnedOnly').addEventListener('change', (event) => {
    earnedOnly = event.target.checked;
    renderList();
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importFile').addEventListener('change', (event) => {
    importProgress(event.target.files[0]);
    event.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all earned trophies?')) {
      earned = new Set();
      saveProgress();
      renderAll();
    }
  });
}

async function init() {
  trophies = await loadTrophies();
  // Mark the five trophies whose method is unconfirmed at launch.
  for (const id of [44, 45, 49, 50, 51]) {
    const trophy = trophies.find((t) => t.id === id);
    if (trophy) trophy.unconfirmed = true;
  }
  const params = applyUrlParams();
  initControls();
  renderAll();
  renderSources();
  applyUrlScroll(params);
}

init();
