// =============================================================
// Mini Notion
// -------------------------------------------------------------
// ✅ 구성: [상태/스토리지] → [테마] → [영속화] → [사이드바 폭/반응형] → [트리 렌더] →
// [드롭다운/인라인 이름변경] → [드래그앤드롭] → [라우팅] → [에디터/툴바]
// [이모지] → [즐겨찾기/새 하위] → [루트 추가] → [휴지통] → [즐겨찾기 모달]
// [퀵서치] → [설정/테마/내보내기/가져오기] → [컨펌 모달] → [단축키] → [init]
// =============================================================

// =====================
// Storage / State
// =====================
const STORAGE_KEY_PREFIX = 'vnotion:user:';

// 현재 로그인한 유저 정보를 반환
function getCurrentUser() {
  const userStr = localStorage.getItem('vnotion:currentUser');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.warn('Failed to parse current user', e);
    }
  }
  return { name: 'Guest', email: 'guest@example.com' };
}

// 현재 로그인한 유저의 스토리지 키를 반환
function getUserStorageKey() {
  const user = getCurrentUser();
  if (user && user.email && user.email !== 'guest@example.com') {
    // 이메일을 기반으로 고유 키 생성 (특수문자 제거)
    const safeEmail = user.email.replace(/[^a-zA-Z0-9]/g, '_');
    return STORAGE_KEY_PREFIX + safeEmail;
  }
  // 비로그인 유저는 guest 키 사용
  return STORAGE_KEY_PREFIX + 'guest';
}

const defaultDocs = [
  {
    id: 'welcome',
    title: 'Welcome',
    icon: '📄',
    parentId: null,
    content: '<p>첫 문서: 좌측 트리에서 추가/삭제/정렬을 연습하세요.</p>',
    starred: false,
    order: 0,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'guides',
    title: 'Guides',
    icon: '',
    parentId: null,
    content:
      '<h2>Guide Index</h2><ul><li>Project Setup</li><li>Performance</li></ul>',
    starred: true,
    order: 1,
    createdAt: Date.now() - 84000000,
    updatedAt: Date.now() - 4200000,
  },
  {
    id: 'setup',
    title: 'Project Setup',
    icon: '🧰',
    parentId: 'guides',
    content:
      '<h1>Setup</h1><p>npm, bundler, dev server… (이 예제는 Vanilla JS!)</p>',
    starred: false,
    order: 0,
    createdAt: Date.now() - 82000000,
    updatedAt: Date.now() - 4000000,
  },
  {
    id: 'perf',
    title: 'Performance',
    icon: '',
    parentId: 'guides',
    content: '<p>CRP, LCP/FCP, 이미지/폰트 최적화 아이디어</p>',
    starred: false,
    order: 1,
    createdAt: Date.now() - 80000000,
    updatedAt: Date.now() - 3800000,
  },
];

const state = {
  docs: [], // 전체 문서(트리)
  trash: [], // 휴지통으로 이동한 문서들
  expanded: {}, // { [docId]: true } 펼침 상태 캐시
  activeId: null, // 현재 열려 있는 문서 id
  isMobile: matchMedia('(max-width:768px)').matches, // 반응형 플래그
};

// =====================
// Theme (Light/Dark/Auto)
// =====================
const THEME_KEY = 'vnotion:theme';

// System preference media query
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function getEffectiveTheme(mode) {
  if (mode === 'auto') {
    return prefersDark.matches ? 'dark' : 'light';
  }
  return mode;
}

function applyTheme(mode) {
  const effectiveTheme = getEffectiveTheme(mode);
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    if (mode === 'auto') {
      themeBtn.innerHTML = '🌗'; // Half moon for auto
    } else {
      themeBtn.innerHTML = effectiveTheme === 'light' ? '☀️' : '🌙';
    }
  }
}

function saveTheme(mode) {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch (e) {}
}

function loadTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark' || t === 'auto') return t;
  } catch (e) {}
  return 'dark';
}

let currentTheme = loadTheme();
applyTheme(currentTheme);

// Listen for system theme changes (for auto mode)
prefersDark.addEventListener('change', () => {
  if (currentTheme === 'auto') {
    applyTheme('auto');
  }
});

// Theme toggle button event (cycles through: dark -> light -> auto)
document.addEventListener('DOMContentLoaded', () => {
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const modes = ['dark', 'light', 'auto'];
      const currentIndex = modes.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % modes.length;
      currentTheme = modes[nextIndex];
      applyTheme(currentTheme);
      saveTheme(currentTheme);
      updateThemeCards();
    });
  }
});

// =====================
// Persistence & helpers
// =====================
function load() {
  try {
    const storageKey = getUserStorageKey();
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      // 새 유저이거나 데이터가 없는 경우 기본 문서로 시작
      state.docs = JSON.parse(JSON.stringify(defaultDocs)); // 깊은 복사
      state.trash = [];
      state.expanded = {};
      state.activeId = null;
      return;
    }
    const data = JSON.parse(raw);
    state.docs = data.docs || JSON.parse(JSON.stringify(defaultDocs));
    state.trash = data.trash || [];
    state.expanded = data.expanded || {};
    state.activeId = data.activeId || null;
  } catch (e) {
    console.warn('Failed to load, using defaults', e);
    state.docs = JSON.parse(JSON.stringify(defaultDocs));
    state.trash = [];
    state.expanded = {};
    state.activeId = null;
  }
}

function save() {
  const storageKey = getUserStorageKey();
  const data = {
    docs: state.docs,
    trash: state.trash,
    expanded: state.expanded,
    activeId: state.activeId,
  };
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function normalizeOrders(pid) {
  const list = childrenOf(pid);
  list.forEach((d, i) => {
    d.order = i;
  });
}

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function childrenOf(pid) {
  return state.docs
    .filter((d) => d.parentId === pid)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

function findDoc(id) {
  return state.docs.find((d) => d.id === id);
}

function maxOrder(pid) {
  const kids = childrenOf(pid);
  return kids.length ? Math.max(...kids.map((k) => k.order)) + 1 : 0;
}

function existsInDocs(id) {
  return !!findDoc(id);
}

function isDescendant(id, maybeAncestorId) {
  if (!id || !maybeAncestorId) return false;
  let cur = findDoc(id);
  while (cur && cur.parentId) {
    if (cur.parentId === maybeAncestorId) return true;
    cur = findDoc(cur.parentId);
  }
  return false;
}

function createDoc({ title = 'Untitled', parentId = null, afterId = null }) {
  const id = uid();
  let order = maxOrder(parentId);
  if (afterId) {
    const sibs = childrenOf(parentId);
    const idx = sibs.findIndex((s) => s.id === afterId);
    order = idx >= 0 ? sibs[idx].order + 0.5 : order;
  }
  const doc = {
    id,
    title,
    icon: '',
    parentId,
    content: '',
    starred: false,
    order,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  state.docs.push(doc);
  normalizeOrders(parentId);
  save();
  return id;
}

function updateDoc(id, patch) {
  const d = findDoc(id);
  if (!d) return;
  const user = getCurrentUser();
  Object.assign(d, patch, {
    updatedAt: Date.now(),
    lastEditedBy: user.name || 'Guest',
  });
  save();
}

function archiveDoc(id) {
  const toArchive = [id, ...descendantsOf(id).map((d) => d.id)];
  toArchive.forEach((did) => {
    const idx = state.docs.findIndex((x) => x.id === did);
    if (idx > -1) {
      state.docs[idx].__origParentId = state.docs[idx].parentId ?? null;
      state.trash.push(state.docs[idx]);
      state.docs.splice(idx, 1);
    }
  });
  save();
}

function restoreDoc(id) {
  const idx = state.trash.findIndex((d) => d.id === id);
  if (idx === -1) return;
  const doc = state.trash[idx];
  state.trash.splice(idx, 1);

  const desiredParentId =
    doc.__origParentId !== undefined ? doc.__origParentId : doc.parentId;

  if (desiredParentId && !existsInDocs(desiredParentId)) {
    doc.parentId = null;
    doc.__restoredOrphan = true;
    doc.__origParentId = desiredParentId;
    toast('부모가 휴지통에 있어 루트로 복원되었습니다.', 'success');
  } else {
    doc.parentId = desiredParentId ?? null;
    delete doc.__restoredOrphan;
  }

  state.docs.push(doc);
  normalizeOrders(doc.parentId);
  reattachOrphansFor(doc.id);
  save();
}

function removeDoc(id) {
  const targetIds = new Set([id, ...descendantsOf(id).map((d) => d.id)]);
  for (let i = state.trash.length - 1; i >= 0; i--) {
    if (targetIds.has(state.trash[i].id)) state.trash.splice(i, 1);
  }
  save();
}

function moveDoc(srcId, targetId, pos) {
  if (!srcId || !targetId || srcId === targetId) return;
  if (isDescendant(targetId, srcId)) return;

  const src = findDoc(srcId);
  const tgt = findDoc(targetId);
  if (!src || !tgt) return;

  if (pos === 'inside') {
    const oldParent = src.parentId;
    src.parentId = tgt.id;
    src.order = maxOrder(tgt.id);
    normalizeOrders(oldParent);
    normalizeOrders(tgt.id);
  } else {
    const newParent = tgt.parentId ?? null;
    const oldParent = src.parentId;
    src.parentId = newParent;
    src.order = pos === 'before' ? tgt.order - 0.5 : tgt.order + 0.5;
    normalizeOrders(newParent);
    normalizeOrders(oldParent);
  }
  src.updatedAt = Date.now();
  save();
}

function descendantsOf(id) {
  const res = [];
  const walk = (pid) => {
    state.docs
      .filter((d) => d.parentId === pid)
      .forEach((c) => {
        res.push(c);
        walk(c.id);
      });
  };
  walk(id);
  return res;
}

function reattachOrphansFor(parentId) {
  let changed = false;
  state.docs.forEach((d) => {
    if (d.__restoredOrphan && d.__origParentId === parentId) {
      d.parentId = parentId;
      delete d.__restoredOrphan;
      changed = true;
    }
  });
  if (changed) {
    normalizeOrders(parentId);
  }
}

// =====================
// DOM helpers & UI (보안 개선)
// =====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function el(tag, opts = {}) {
  const e = document.createElement(tag);
  // textContent만 사용하여 XSS 방지
  if (opts.textContent) {
    e.textContent = opts.textContent;
    delete opts.textContent;
  }
  Object.assign(e, opts);
  return e;
}

// 안전한 텍스트 이스케이프 함수
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toast(msg, type = '') {
  const wrap = $('#toasts');
  if (!wrap) return;
  const t = el('div', { className: `toast ${type}` });
  t.textContent = msg;
  t.setAttribute('role', 'alert');
  t.setAttribute('aria-live', 'assertive');
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 200);
  }, 1800);
}

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

// Layout refs
const sidebar = $('#sidebar');
const resizeHandle = $('#resizeHandle');
const menuBtn = $('#menuBtn');
const sidebarPeekBtn = $('#sidebarPeekBtn');
const docListRoot = $('#docListRoot');
const breadcrumbs = $('#breadcrumbs');
const starBtn = $('#starBtn');
const newChildBtn = $('#newChildBtn');

// Sidebar width - 고정 크기이므로 관련 함수 단순화
const LS_LAST_WIDTH_KEY = 'vnotion:lastSidebarWidth';

// 사이드바 토글 함수
function toggleSidebar() {
  sidebar.classList.toggle('is-collapsed');
}

function collapse() {
  sidebar.classList.add('is-collapsed');
}

function expand() {
  sidebar.classList.remove('is-collapsed');
}

// menuBtn 클릭 시 토글
menuBtn?.addEventListener('click', () => {
  toggleSidebar();
});

sidebarPeekBtn?.addEventListener('click', () => {
  expand();
});

// 사이드바 크기 고정 - 리사이즈 기능 비활성화
// (리사이즈 핸들이 CSS에서 숨겨져 있으므로 이 코드는 실행되지 않음)
let isResizing = false;

matchMedia('(max-width:768px)').addEventListener('change', (ev) => {
  state.isMobile = ev.matches;
  if (state.isMobile) {
    collapse();
  } else {
    expand();
  }
});
if (state.isMobile) {
  collapse();
} else {
  expand();
}

window.addEventListener('orientationchange', () => {
  if (state.isMobile) {
    collapse();
  }
});

window.addEventListener('resize', () => {
  const vw = window.innerWidth;
  if (vw < 768 && !sidebar.classList.contains('is-collapsed')) {
    collapse();
  }
});

// =====================
// Render: Trees (접근성 개선)
// =====================
function renderTrees() {
  renderTree();
}

function renderTree() {
  if (!docListRoot) return;
  docListRoot.innerHTML = '';
  const roots = childrenOf(null);
  if (roots.length === 0) {
    const p = el('p', {
      className: 'muted',
      textContent: 'No pages available',
    });
    docListRoot.appendChild(p);
  }
  roots.forEach((d) => docListRoot.appendChild(renderNode(d, 0)));
}

function renderNode(doc, level) {
  const wrap = el('div');
  const row = el('div', { className: 'tree-row', draggable: true });
  row.dataset.id = doc.id;
  row.setAttribute('role', 'treeitem');
  row.setAttribute('tabindex', '0');
  row.setAttribute('aria-label', `${doc.icon || '📄'} ${doc.title}`);

  if (state.activeId === doc.id) {
    row.classList.add('active');
    row.setAttribute('aria-selected', 'true');
  } else {
    row.setAttribute('aria-selected', 'false');
  }

  row.style.paddingLeft = 12 + level * 12 + 'px';

  const hasChildren = childrenOf(doc.id).length > 0;
  const caretBtn = el('div', {
    className: 'caret',
    title: hasChildren ? '펼치기/접기' : '',
  });
  caretBtn.setAttribute('role', hasChildren ? 'button' : 'presentation');
  caretBtn.setAttribute(
    'aria-label',
    hasChildren ? (state.expanded[doc.id] ? '접기' : '펼치기') : ''
  );
  caretBtn.textContent = hasChildren
    ? state.expanded[doc.id]
      ? '▼'
      : '▶'
    : '';

  if (hasChildren) {
    row.setAttribute(
      'aria-expanded',
      state.expanded[doc.id] ? 'true' : 'false'
    );
    caretBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.expanded[doc.id] = !state.expanded[doc.id];
      renderTrees();
    });
  }

  const iconCls = 'doc-icon ' + (doc.icon ? 'has-icon' : 'no-icon');
  const icon = el('div', {
    className: iconCls,
    textContent: doc.icon ? doc.icon : '∅',
  });
  icon.setAttribute('aria-hidden', 'true');

  const labelCls = 'label ' + (doc.icon ? 'has-icon' : 'no-icon');
  const label = el('div', {
    className: labelCls,
    textContent: doc.title,
    style: 'flex:1 1 auto; min-width:0;',
  });
  label.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    inlineRename(doc.id, label);
  });

  const actions = el('div', { className: 'tree-actions' });
  const addBtn = el('div', {
    className: 'icon-btn ghost',
    title: '하위 페이지 추가',
    textContent: '＋',
  });
  addBtn.setAttribute('role', 'button');
  addBtn.setAttribute('aria-label', '하위 페이지 추가');
  addBtn.setAttribute('tabindex', '0');

  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = createDoc({ title: 'Untitled', parentId: doc.id });
    state.expanded[doc.id] = true;
    toast('New note created!', 'success');
    navigateTo(id);
  });

  // 키보드 지원
  addBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addBtn.click();
    }
  });

  const ddBtn = el('div', {
    className: 'dropdown-btn ghost',
    title: '더보기',
    textContent: '⋯',
  });
  ddBtn.setAttribute('role', 'button');
  ddBtn.setAttribute('aria-label', '더보기 메뉴');
  ddBtn.setAttribute('aria-haspopup', 'true');
  ddBtn.setAttribute('tabindex', '0');

  ddBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDropdownMenu(ddBtn, doc, label);
  });

  // 키보드 지원
  ddBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ddBtn.click();
    }
  });

  actions.append(ddBtn, addBtn);
  row.append(caretBtn, icon, label, actions);

  row.addEventListener('click', () => navigateTo(doc.id));

  // 키보드 내비게이션
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateTo(doc.id);
    }
    if (e.key === 'ArrowRight' && hasChildren && !state.expanded[doc.id]) {
      e.preventDefault();
      state.expanded[doc.id] = true;
      renderTrees();
    }
    if (e.key === 'ArrowLeft' && state.expanded[doc.id]) {
      e.preventDefault();
      state.expanded[doc.id] = false;
      renderTrees();
    }
  });

  // DnD
  row.addEventListener('dragstart', handleDragStart);
  row.addEventListener('dragover', handleDragOver);
  row.addEventListener('dragleave', handleDragLeave);
  row.addEventListener('drop', handleDrop);
  row.addEventListener('dragend', handleDragEnd);

  wrap.append(row);

  if (state.expanded[doc.id]) {
    const kidsWrap = el('div', { className: 'children' });
    kidsWrap.setAttribute('role', 'group');
    childrenOf(doc.id).forEach((ch) =>
      kidsWrap.appendChild(renderNode(ch, level + 1))
    );
    wrap.append(kidsWrap);
  }
  return wrap;
}

// Body-portal dropdown
let currentDropdown = null;

function openDropdownMenu(anchorEl, doc, labelEl) {
  closeDropdownMenu();
  const rect = anchorEl.getBoundingClientRect();
  const menu = el('div', { className: 'dropdown-menu open' });
  const miRename = el('div', {
    className: 'menu-item',
    textContent: 'Rename (F2)',
  });
  const miStar = el('div', {
    className: 'menu-item',
    textContent: doc.starred ? 'Unstar' : 'Add to favorites',
  });

  const miDel = el('div', {
    className: 'menu-item',
    textContent: 'Delete (move to trash)',
  });
  const sep = el('div', { className: 'menu-sep' });
  const editedBy = el('div', { className: 'menu-item muted' });
  editedBy.textContent = `Last edited by: ${doc.lastEditedBy || 'Guest'}`;

  miRename.addEventListener('click', (e) => {
    e.stopPropagation();
    inlineRename(doc.id, labelEl);
    closeDropdownMenu();
  });

  miStar.addEventListener('click', (e) => {
    e.stopPropagation();
    updateDoc(doc.id, { starred: !doc.starred });
    if (state.activeId === doc.id) {
      const d = findDoc(doc.id);
      starBtn.textContent = d.starred ? '★' : '☆';
    }
    renderTrees();
    closeDropdownMenu();
  });

  miDel.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmModal(`Move “${doc.title}” and its subpages to Trash?`, () => {
      archiveDoc(doc.id);
      toast('Note moved to trash!');
      if (state.activeId === doc.id) navigateTo(null);
      renderTrees();
      renderTrash();
    });
    closeDropdownMenu();
  });

  menu.append(miRename, miStar, miDel, sep, editedBy);
  document.body.appendChild(menu);
  const top = rect.bottom + 6;
  const left = Math.min(rect.left, window.innerWidth - 260);
  menu.style.top = top + 'px';
  menu.style.left = left + 'px';

  currentDropdown = menu;
}

function closeDropdownMenu() {
  if (currentDropdown) {
    currentDropdown.remove();
    currentDropdown = null;
  }
}
document.addEventListener('click', closeDropdownMenu);

function inlineRename(id, labelEl) {
  const doc = findDoc(id);
  if (!doc) return;
  const input = el('input', { value: doc.title, className: 'label-edit' });
  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      input.value = doc.title;
      input.blur();
    }
  });
  input.addEventListener('blur', () => {
    const title = input.value.trim() || 'Untitled';
    updateDoc(id, { title });
    renderTrees();
    if (state.activeId === id) {
      $('#titleInput').value = title;
      updateDocMeta();
    }
  });
  labelEl.replaceWith(input);
  input.focus();
  input.select();
}

// DnD handlers
let dragSrcId = null;
function handleDragStart(e) {
  dragSrcId = this.dataset.id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSrcId);
}

function handleDragOver(e) {
  e.preventDefault();
  const rect = this.getBoundingClientRect();
  const y = e.clientY - rect.top;
  this.classList.remove('dragover-top', 'dragover-bottom', 'dragover-inside');
  if (y < rect.height * 0.25) {
    this.classList.add('dragover-top');
  } else if (y > rect.height * 0.75) {
    this.classList.add('dragover-bottom');
  } else {
    this.classList.add('dragover-inside');
  }
}

function handleDragLeave() {
  this.classList.remove('dragover-top', 'dragover-bottom', 'dragover-inside');
}

function handleDrop(e) {
  e.preventDefault();
  const targetId = this.dataset.id;
  const rect = this.getBoundingClientRect();
  const y = e.clientY - rect.top;
  let pos = 'inside';
  if (y < rect.height * 0.25) pos = 'before';
  else if (y > rect.height * 0.75) pos = 'after';
  moveDoc(dragSrcId, targetId, pos);
  this.classList.remove('dragover-top', 'dragover-bottom', 'dragover-inside');
  renderTrees();
}

function handleDragEnd() {
  $$('.tree-row').forEach((r) =>
    r.classList.remove('dragover-top', 'dragover-bottom', 'dragover-inside')
  );
  dragSrcId = null;
}

// =====================
// Routing & content
// =====================
function navigateTo(id) {
  if (!id) {
    location.hash = '#/documents';
  } else {
    location.hash = '#/documents/' + id;
  }
}

function syncFromLocation() {
  const m = location.hash.match(/#\/documents\/?([\w-]+)?/);
  const id = m && m[1] ? m[1] : null;
  state.activeId = id;
  renderTrees();
  renderPage();
  save();
}
window.addEventListener('hashchange', syncFromLocation);

function pathOf(id) {
  const path = [];
  let cur = findDoc(id);
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? findDoc(cur.parentId) : null;
  }
  return path;
}

// =====================
// Editor / Toolbar
// =====================

const emojiPicker = $('#emojiPicker');
const emojiGrid = $('#emojiGrid');

const titleInput = $('#titleInput');
const docMeta = $('#docMeta');
const editor = $('#editor');
const iconBtn = $('#iconBtn'); // [추가] 아이콘 버튼 참조

function renderPage() {
  if (!breadcrumbs || !titleInput || !editor || !starBtn || !docMeta) return;
  if (!state.activeId) {
    breadcrumbs.textContent = 'No page selected';
    titleInput.value = 'Welcome 👋';
    docMeta.textContent = '—';
    // [추가] 선택된 문서가 없을 때 기본 아이콘
    if (iconBtn) iconBtn.textContent = '📄';
    editor.innerHTML =
      '<p>좌측에서 문서를 선택하거나 새로운 페이지를 만들어 보세요.</p>';
    starBtn.textContent = '☆';
    return;
  }
  const doc = findDoc(state.activeId);
  if (!doc) {
    breadcrumbs.textContent = 'Unknown page';
    titleInput.value = 'Not found';
    editor.innerHTML = '<p>이 문서는 존재하지 않습니다.</p>';
    return;
  }
  const path = pathOf(doc.id)
    .map((d) => d.title)
    .join(' / ');
  breadcrumbs.textContent = path;
  titleInput.value = doc.title;

  // [추가] 현재 문서의 아이콘 반영 (없으면 기본값 📄)
  if (iconBtn) iconBtn.textContent = doc.icon || '📄';

  editor.innerHTML = doc.content || '<p></p>';
  starBtn.textContent = doc.starred ? '★' : '☆';
  updateDocMeta();
}

function updateDocMeta() {
  if (!docMeta) return;
  const d = state.activeId ? findDoc(state.activeId) : null;
  const ld = $('#lastEdited');
  if (ld) {
    const editedBy = d?.lastEditedBy || 'Guest';
    ld.textContent = `${new Date().toLocaleDateString()} by ${editedBy}`;
  }
  if (!d) {
    docMeta.textContent = '—';
    return;
  }
  const editedBy = d.lastEditedBy ? ` by ${d.lastEditedBy}` : '';
  docMeta.textContent = `Created ${fmtDate(d.createdAt)} · Updated ${fmtDate(
    d.updatedAt
  )}${editedBy}`;
}

// Toolbar 버튼 활성화 상태 업데이트
function updateToolbarState() {
  const toolbar = $('#toolbar');
  if (!toolbar) return;

  // 현재 선택된 텍스트의 스타일 상태 확인
  const isBold = document.queryCommandState('bold');
  const isItalic = document.queryCommandState('italic');
  const isUnderline = document.queryCommandState('underline');

  // 모든 버튼 상태 초기화 및 업데이트
  toolbar.querySelectorAll('button[data-cmd]').forEach((btn) => {
    const cmd = btn.dataset.cmd;
    let isActive = false;

    switch (cmd) {
      case 'bold':
        isActive = isBold;
        break;
      case 'italic':
        isActive = isItalic;
        break;
      case 'underline':
        isActive = isUnderline;
        break;
    }

    btn.classList.toggle('active', isActive);
  });

  // 포맷 버튼 상태 업데이트
  const formatValue = document.queryCommandValue('formatBlock');
  toolbar.querySelectorAll('button[data-format]').forEach((btn) => {
    const fmt = btn.dataset.format;
    const isActive =
      formatValue.toLowerCase() === fmt.toLowerCase() ||
      formatValue.toLowerCase() === `<${fmt.toLowerCase()}>`;
    btn.classList.toggle('active', isActive);
  });

  // 리스트 버튼 상태
  const bulletsBtn = $('#bulletsBtn');
  const numbersBtn = $('#numbersBtn');
  if (bulletsBtn) {
    bulletsBtn.classList.toggle(
      'active',
      document.queryCommandState('insertUnorderedList')
    );
  }
  if (numbersBtn) {
    numbersBtn.classList.toggle(
      'active',
      document.queryCommandState('insertOrderedList')
    );
  }
}

// 에디터 선택 변경 시 툴바 상태 업데이트
document.addEventListener('selectionchange', () => {
  if (
    document.activeElement === editor ||
    editor?.contains(document.activeElement)
  ) {
    updateToolbarState();
  }
});

$('#toolbar')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const cmd = btn.dataset.cmd;
  const fmt = btn.dataset.format;
  editor.focus();

  if (cmd) {
    document.execCommand(cmd, false, null);
    updateToolbarState();
    saveEditor();
    return;
  }

  if (fmt) {
    document.execCommand('formatBlock', false, fmt === 'P' ? 'P' : fmt);
    updateToolbarState();
    saveEditor();
    return;
  }
});

$('#bulletsBtn')?.addEventListener('click', () => {
  editor.focus();
  document.execCommand('insertUnorderedList');
  updateToolbarState();
  saveEditor();
});

$('#numbersBtn')?.addEventListener('click', () => {
  editor.focus();
  document.execCommand('insertOrderedList');
  updateToolbarState();
  saveEditor();
});

$('#codeBtn')?.addEventListener('click', () => {
  editor.focus();
  document.execCommand('formatBlock', false, 'PRE');
  updateToolbarState();
  saveEditor();
});

$('#quoteBtn')?.addEventListener('click', () => {
  editor.focus();
  document.execCommand('formatBlock', false, 'BLOCKQUOTE');
  updateToolbarState();
  saveEditor();
});

$('#todoBtn')?.addEventListener('click', () => {
  const box = document.createElement('div');
  box.innerHTML = '<label><input type="checkbox"> <span>To-do</span></label>';
  const sel = window.getSelection();
  if (!sel.rangeCount) {
    editor.appendChild(box);
  } else {
    sel.getRangeAt(0).insertNode(box);
  }
  saveEditor();
});

let saveTimer = null;

function saveEditorDebounced() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveEditor, 400);
}

function saveEditor() {
  if (!state.activeId) return;
  const html = editor.innerHTML;
  updateDoc(state.activeId, { content: html });
  updateDocMeta();
}
editor?.addEventListener('input', saveEditorDebounced);

titleInput?.addEventListener('input', () => {
  if (!state.activeId) return;
  const t = titleInput.value.trim() || 'Untitled';
  updateDoc(state.activeId, { title: t });
  renderTrees();
  updateDocMeta();
});

// =====================
// Emoji picker
// =====================
const EMOJI = [
  '📄',
  '📘',
  '📙',
  '📗',
  '📕',
  '📚',
  '🧠',
  '🧰',
  '🧪',
  '🧭',
  '🗂️',
  '📝',
  '🧾',
  '📊',
  '📈',
  '📎',
  '📌',
  '⭐',
  '⚡',
  '🔥',
  '✅',
  '🧩',
  '🎯',
  '🔧',
  '🔗',
  '💡',
  '🚀',
  '🌟',
  '🛠️',
  '🗒️',
  '🧱',
  '🪄',
  '🗃️',
  '🧭',
  '💼',
  '🗓️',
  '😊',
  '🥰',
  '🚀',
  '⭐',
  '🔥',
  '🌈',
  '🦄',
  '🐱',
  '🐶',
  '🎉',
  '🍎',
  '🍔',
];

// 이모지 피커 상태 (콜백 함수 저장)
let onEmojiSelect = null;

function openEmojiPicker(anchorEl, callback) {
  if (!anchorEl || !emojiPicker) return;
  const rect = anchorEl.getBoundingClientRect();
  emojiPicker.style.left = Math.min(rect.left, window.innerWidth - 340) + 'px';
  emojiPicker.style.top = rect.bottom + 8 + 'px';
  emojiPicker.classList.add('open');

  // 콜백 저장
  onEmojiSelect = callback;
}

function closeEmojiPicker() {
  emojiPicker?.classList.remove('open');
  onEmojiSelect = null;
}

document.getElementById('iconBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  buildEmojiGrid();
  // 문서 아이콘 변경용 콜백
  openEmojiPicker(e.target, (em) => {
    if (state.activeId) {
      updateDoc(state.activeId, { icon: em });
      const btn = document.getElementById('iconBtn');
      if (btn) btn.textContent = em;
      renderTrees();
    }
  });
});

document.addEventListener('click', (e) => {
  if (
    emojiPicker &&
    !emojiPicker.contains(e.target) &&
    e.target.id !== 'iconBtn' &&
    e.target.id !== 'settingsAvatarBtn'
  )
    closeEmojiPicker();
});

function buildEmojiGrid() {
  if (!emojiGrid) return;
  emojiGrid.innerHTML = '';
  EMOJI.forEach((em) => {
    const b = el('button', { textContent: em });
    b.addEventListener('click', () => {
      if (onEmojiSelect) {
        onEmojiSelect(em);
      }
      closeEmojiPicker();
    });
    emojiGrid.appendChild(b);
  });
}

// Star (favorite)
starBtn?.addEventListener('click', () => {
  if (!state.activeId) return;
  const d = findDoc(state.activeId);
  updateDoc(state.activeId, { starred: !d.starred });
  const nd = findDoc(state.activeId);
  starBtn.textContent = nd.starred ? '★' : '☆';
  renderTrees();
});

// New subpage button
newChildBtn?.addEventListener('click', () => {
  const pid = state.activeId || null;
  const id = createDoc({ title: 'Untitled', parentId: pid });
  if (pid) state.expanded[pid] = true;
  toast('New subpage created!', 'success');
  navigateTo(id);
});

// =====================
// Root add-page actions
// =====================
const actionAddPage = document.getElementById('actionAddPage');
const actionCreateRoot = document.getElementById('actionCreateRoot');
[actionAddPage, actionCreateRoot].forEach((btn) => {
  if (btn) {
    btn.addEventListener('click', () => {
      const id = createDoc({ title: 'Untitled', parentId: null });
      toast('New page created!', 'success');
      navigateTo(id);
    });
  }
});

// =====================
// Trash popover
// =====================
const trashTrigger = $('#trashTrigger');
const trashPopover = $('#trashPopover');

function positionTrashPopover() {
  if (!trashTrigger || !trashPopover) return;
  const rect = trashTrigger.getBoundingClientRect();
  const bottom = window.matchMedia('(max-width:768px)').matches;
  if (bottom) {
    trashPopover.style.left =
      Math.min(rect.left, window.innerWidth - 340) + 'px';
    trashPopover.style.top = rect.bottom + 8 + 'px';
  } else {
    trashPopover.style.left =
      Math.min(rect.right + 8, window.innerWidth - 340) + 'px';
    trashPopover.style.top = rect.top + 'px';
  }
}

function toggleTrash() {
  if (!trashPopover) return;
  if (trashPopover.classList.contains('open')) {
    trashPopover.classList.remove('open');
    return;
  }
  positionTrashPopover();
  trashPopover.classList.add('open');
}

trashTrigger?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleTrash();
});

window.addEventListener('resize', () => {
  if (trashPopover?.classList.contains('open')) positionTrashPopover();
});

document.addEventListener('click', (e) => {
  if (
    trashPopover &&
    !trashPopover.contains(e.target) &&
    e.target !== trashTrigger
  )
    trashPopover.classList.remove('open');
});

function renderTrash() {
  const list = $('#trashList');

  if (!list) return;
  const search = ($('#trashSearch')?.value || '').trim().toLowerCase();
  list.innerHTML = '';
  const filtered = state.trash.filter((d) =>
    d.title.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    const p = el('p', {
      className: 'muted',
      textContent: 'No documents found',
    });
    list.appendChild(p);
    return;
  }

  filtered.forEach((doc) => {
    const row = el('div', { className: 'trash-row' });
    const title = el('span', {
      textContent: doc.title,
      style: 'flex:1 1 auto; min-width:0',
    });

    const info = el('span', {
      className: 'muted',
      textContent:
        doc.__origParentId && !existsInDocs(doc.__origParentId)
          ? '→ 복원 시 루트로 이동'
          : '',
    });

    const acts = el('div', { className: 'trash-actions' });
    const restore = el('div', {
      className: 'icon-btn',
      title: 'Restore',
      textContent: '↩',
    });

    const del = el('div', {
      className: 'icon-btn',
      title: 'Delete permanently',
      textContent: '🗑️',
    });

    restore.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreDoc(doc.id);
      renderTrees();
      renderTrash();
    });

    del.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmModal(`Delete “${doc.title}” permanently?`, () => {
        removeDoc(doc.id);
        toast('Note deleted!', 'error');
        renderTrash();
      });
    });

    acts.append(info, restore, del);
    row.append(title, acts);
    row.addEventListener('click', () => {
      trashPopover?.classList.remove('open');
      navigateTo(doc.id);
    });
    list.appendChild(row);
  });
}

document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'trashSearch') renderTrash();
});

// =====================
// Favorites modal
// =====================

const favoritesOverlay = $('#favoritesOverlay');
const favoritesListModal = $('#favoritesListModal');
const openFavoritesModalBtn = $('#openFavoritesModal');
const favoritesCloseBtn = $('#favoritesClose');

function openFavoritesModal() {
  buildFavoritesModal();
  if (favoritesOverlay) favoritesOverlay.style.display = 'grid';
}

function closeFavoritesModal() {
  if (favoritesOverlay) favoritesOverlay.style.display = 'none';
}

function buildFavoritesModal() {
  if (!favoritesListModal) return;
  favoritesListModal.innerHTML = '';

  const favs = state.docs
    .filter((d) => d.starred)
    .sort((a, b) => a.title.localeCompare(b.title));

  // 빈 상태 표시
  if (favs.length === 0) {
    const emptyState = el('div', { className: 'favorites-empty' });
    const emptyIcon = el('div', { className: 'empty-icon', textContent: '⭐' });
    const emptyText = el('div', {
      className: 'empty-text',
      textContent: '즐겨찾기가 없습니다',
    });
    const emptyHint = el('div', {
      className: 'empty-hint',
      textContent: '페이지의 ☆ 버튼을 눌러 즐겨찾기에 추가하세요',
    });
    emptyState.appendChild(emptyIcon);
    emptyState.appendChild(emptyText);
    emptyState.appendChild(emptyHint);
    favoritesListModal.appendChild(emptyState);
    return;
  }

  favs.forEach((doc) => {
    const row = el('div', { className: 'fav-row' });

    // 아이콘
    const iconDiv = el('div', {
      className: 'fav-icon',
      textContent: doc.icon || '📄',
    });

    // 정보 영역
    const infoDiv = el('div', { className: 'fav-info' });
    const titleDiv = el('div', {
      className: 'fav-title',
      textContent: doc.title,
    });
    const pathDiv = el('div', { className: 'fav-path' });

    // 경로 표시
    const path = pathOf(doc.id);
    if (path.length > 1) {
      pathDiv.textContent = path
        .slice(0, -1)
        .map((p) => p.title)
        .join(' / ');
    } else {
      pathDiv.textContent = 'Root';
    }

    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(pathDiv);

    // 액션 버튼
    const acts = el('div', { className: 'fav-actions' });
    const unstar = el('button', {
      className: 'unstar-btn',
      title: '즐겨찾기 해제',
      textContent: '★',
    });

    unstar.addEventListener('click', (e) => {
      e.stopPropagation();
      updateDoc(doc.id, { starred: false });
      if (state.activeId === doc.id) {
        const d = findDoc(doc.id);
        if (starBtn) starBtn.textContent = d.starred ? '★' : '☆';
      }
      renderTrees();
      buildFavoritesModal();
      toast('즐겨찾기에서 제거되었습니다');
    });

    row.appendChild(iconDiv);
    row.appendChild(infoDiv);
    row.appendChild(acts);
    acts.appendChild(unstar);

    row.addEventListener('click', () => {
      closeFavoritesModal();
      navigateTo(doc.id);
    });

    favoritesListModal.appendChild(row);
  });
}

openFavoritesModalBtn?.addEventListener('click', openFavoritesModal);
favoritesCloseBtn?.addEventListener('click', closeFavoritesModal);
favoritesOverlay?.addEventListener('click', (e) => {
  if (e.target === favoritesOverlay) closeFavoritesModal();
});

document.addEventListener('keydown', (e) => {
  if (
    favoritesOverlay &&
    favoritesOverlay.style.display === 'grid' &&
    e.key === 'Escape'
  ) {
    e.preventDefault();
    closeFavoritesModal();
  }
});

// =====================
// Quick Search Modal (XSS 방지)
// =====================
const searchOverlay = $('#searchOverlay');
const searchInput = $('#searchInput');
const searchResults = $('#searchResults');

let searchActiveIndex = -1;

function openSearch() {
  if (searchOverlay && searchInput) {
    searchOverlay.style.display = 'grid';
    searchInput.value = '';
    renderSearchResults('');
    searchInput.focus();
  }
}

function closeSearch() {
  if (searchOverlay) searchOverlay.style.display = 'none';
}

function renderSearchResults(q) {
  if (!searchResults) return;
  const items = state.docs.filter((d) =>
    d.title.toLowerCase().includes(q.toLowerCase())
  );
  searchResults.innerHTML = '';

  // 빈 상태 표시
  if (items.length === 0) {
    const emptyState = el('div', { className: 'search-empty' });
    const emptyIcon = el('div', { className: 'empty-icon', textContent: '🔍' });
    const emptyText = el('div', { className: 'empty-text' });
    emptyText.textContent = q
      ? `"${q}"에 대한 결과가 없습니다`
      : '페이지를 검색하세요';
    emptyState.appendChild(emptyIcon);
    emptyState.appendChild(emptyText);
    searchResults.appendChild(emptyState);
    return;
  }

  items.forEach((d, i) => {
    const row = el('div', { className: 'search-item' });
    row.setAttribute('role', 'option');
    row.setAttribute('tabindex', '0');

    // 아이콘
    const iconDiv = el('div', {
      className: 'icon',
      textContent: d.icon || '📄',
    });

    // 정보 영역
    const infoDiv = el('div', { className: 'info' });
    const titleDiv = el('div', { className: 'title', textContent: d.title });
    const pathDiv = el('div', { className: 'path' });

    // 경로 표시
    const path = pathOf(d.id);
    if (path.length > 1) {
      pathDiv.textContent = path
        .slice(0, -1)
        .map((p) => p.title)
        .join(' / ');
    } else {
      pathDiv.textContent = 'Root';
    }

    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(pathDiv);

    row.appendChild(iconDiv);
    row.appendChild(infoDiv);

    row.addEventListener('click', () => {
      closeSearch();
      navigateTo(d.id);
    });

    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        closeSearch();
        navigateTo(d.id);
      }
    });

    if (i === searchActiveIndex) {
      row.classList.add('active');
      row.setAttribute('aria-selected', 'true');
    } else {
      row.setAttribute('aria-selected', 'false');
    }
    searchResults.appendChild(row);
  });
}

searchInput?.addEventListener('input', () => {
  searchActiveIndex = -1;
  renderSearchResults(searchInput.value);
});

searchInput?.addEventListener('keydown', (e) => {
  const items = searchResults?.querySelectorAll('.search-item') || [];
  if (e.key === 'Escape') {
    e.preventDefault();
    closeSearch();
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    searchActiveIndex = Math.min(items.length - 1, searchActiveIndex + 1);
    renderSearchResults(searchInput.value);
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    searchActiveIndex = Math.max(0, searchActiveIndex - 1);
    renderSearchResults(searchInput.value);
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    if (items.length && searchActiveIndex >= 0) {
      items[searchActiveIndex].click();
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (
    searchOverlay &&
    searchOverlay.style.display === 'grid' &&
    e.key === 'Escape'
  ) {
    e.preventDefault();
    closeSearch();
  }
});

searchOverlay?.addEventListener('click', (e) => {
  if (e.target === searchOverlay) closeSearch();
});

document.querySelectorAll('#actionSearch').forEach((el) => {
  el.addEventListener('click', openSearch);
});

// Navbar 검색 버튼 연결
$('#navbarSearch')?.addEventListener('click', openSearch);

// =====================
// Settings Modal + Theme + Export/Import
// =====================

const settingsOverlay = $('#settingsOverlay');
const settingsNameInput = $('#settingsNameInput');
const settingsAvatarBtn = $('#settingsAvatarBtn');
const settingsSaveNameBtn = $('#settingsSaveNameBtn'); // 이름 저장 버튼
const settingsLogoutBtn = $('#settingsLogoutBtn'); // 로그아웃 버튼

function openSettings() {
  currentTheme = loadTheme();
  updateThemeCards();
  if (settingsOverlay) settingsOverlay.style.display = 'grid';

  // [추가된 부분] 현재 유저 정보 로드
  const userStr = localStorage.getItem('vnotion:currentUser');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (settingsNameInput) settingsNameInput.value = user.name || '';
      if (settingsAvatarBtn)
        settingsAvatarBtn.textContent = user.avatar || '😊';
    } catch (e) {}
  }
}

// [추가된 부분] 유저 프로필(이름/아바타) 저장 로직
function saveUserProfile(updates) {
  // 1. 현재 세션 업데이트
  const userStr = localStorage.getItem('vnotion:currentUser');
  if (!userStr) return;
  let user = JSON.parse(userStr);
  Object.assign(user, updates);
  localStorage.setItem('vnotion:currentUser', JSON.stringify(user));

  // 2. 전체 유저 목록(DB) 업데이트
  try {
    const usersStr = localStorage.getItem('vnotion:users');
    if (usersStr) {
      let users = JSON.parse(usersStr);
      const idx = users.findIndex(
        (u) => u.id === user.id || u.email === user.email
      );
      if (idx > -1) {
        Object.assign(users[idx], updates);
        localStorage.setItem('vnotion:users', JSON.stringify(users));
      }
    }
  } catch (e) {}

  // 3. UI 즉시 반영
  checkSession();
  toast('Profile updated!', 'success');
}

// 1. 이름 저장 버튼 클릭 이벤트
settingsSaveNameBtn?.addEventListener('click', () => {
  if (settingsNameInput) {
    saveUserProfile({ name: settingsNameInput.value });
  }
});

// 2. 아바타 이모지 피커 이벤트
settingsAvatarBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  buildEmojiGrid();
  openEmojiPicker(e.target, (em) => {
    saveUserProfile({ avatar: em });
    settingsAvatarBtn.textContent = em;
  });
});

// 3. 설정 내 로그아웃 버튼 이벤트
settingsLogoutBtn?.addEventListener('click', () => {
  if (confirm('로그아웃 하시겠습니까?')) {
    localStorage.removeItem('vnotion:currentUser');
    location.href = 'login.html';
  }
});

document.querySelectorAll('#actionSettings').forEach((el) => {
  el.addEventListener('click', openSettings);
});

// Navbar 설정 버튼 연결
$('#navbarSettings')?.addEventListener('click', openSettings);

$('#settingsClose')?.addEventListener('click', () => {
  if (settingsOverlay) settingsOverlay.style.display = 'none';
});

settingsOverlay?.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) settingsOverlay.style.display = 'none';
});

document.addEventListener('keydown', (e) => {
  if (
    settingsOverlay &&
    settingsOverlay.style.display === 'grid' &&
    e.key === 'Escape'
  ) {
    e.preventDefault();
    settingsOverlay.style.display = 'none';
  }
});

// Theme cards selection
function updateThemeCards() {
  const cards = document.querySelectorAll(
    '.theme-card input[name="themeMode"]'
  );
  cards.forEach((radio) => {
    radio.checked = radio.value === currentTheme;
  });
}

document
  .querySelectorAll('.theme-card input[name="themeMode"]')
  .forEach((radio) => {
    radio.addEventListener('change', (e) => {
      currentTheme = e.target.value;
      applyTheme(currentTheme);
      saveTheme(currentTheme);
    });
  });

$('#exportBtn')?.addEventListener('click', () => {
  const storageKey = getUserStorageKey();
  const data = localStorage.getItem(storageKey) || '{}';
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'notion-export.json';
  a.click();
  URL.revokeObjectURL(url);
});

$('#importFile')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const storageKey = getUserStorageKey();
      localStorage.setItem(storageKey, reader.result);
      load();
      renderTrees();
      renderPage();
      toast('Import complete', 'success');
    } catch (err) {
      toast('Import failed', 'error');
    }
  };
  reader.readAsText(file);
});

// =====================
// Confirm modal
// =====================

const modalOverlay = $('#modalOverlay');
let modalResolver = null;

function confirmModal(message, onConfirm) {
  const t = $('#modalTitle'),
    m = $('#modalMessage');
  if (t) t.textContent = 'Confirm';
  if (m) m.textContent = message;
  if (modalOverlay) modalOverlay.style.display = 'flex';
  modalResolver = onConfirm;
}

$('#modalCancel')?.addEventListener('click', () => {
  if (modalOverlay) modalOverlay.style.display = 'none';
  modalResolver = null;
});

$('#modalConfirm')?.addEventListener('click', () => {
  if (modalOverlay) modalOverlay.style.display = 'none';
  if (modalResolver) modalResolver();
  modalResolver = null;
});

// =====================
// Keyboard shortcuts
// =====================

document.addEventListener('keydown', (e) => {
  const meta = e.ctrlKey || e.metaKey;

  if (meta && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearch();
  }

  if (meta && e.altKey && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    const pid = state.activeId || null;
    const id = createDoc({ title: 'Untitled', parentId: pid });
    if (pid) state.expanded[pid] = true;
    navigateTo(id);
  }

  if (e.key === 'F2' && state.activeId) {
    e.preventDefault();
    const row = document.querySelector(
      `.tree-row[data-id="${state.activeId}"]`
    );

    if (row) {
      const label = row.querySelector('.label');
      if (label) inlineRename(state.activeId, label);
    }
  }
});

// =====================
// Init
// =====================

function checkSession() {
  const userStr = localStorage.getItem('vnotion:currentUser');
  const userBox = document.querySelector('.user-box');
  const nameEl = document.querySelector('.user-meta strong');
  const emailEl = document.querySelector('.user-meta small');
  const avatarEl = document.querySelector('.avatar');

  if (userStr) {
    // 1. 로그인 되어 있는 경우
    try {
      const user = JSON.parse(userStr);
      if (nameEl) nameEl.textContent = user.name;
      if (emailEl) emailEl.textContent = user.email;
      // [수정된 부분] 아바타 설정이 있으면 사용, 없으면 이니셜
      if (avatarEl) {
        avatarEl.textContent = user.avatar || user.name.charAt(0).toUpperCase();
      }

      // [수정됨] 로그아웃 기능 제거 (설정에서만 가능하도록)
      if (userBox) {
        userBox.onclick = null; // 클릭 이벤트 제거
        userBox.style.cursor = 'default';
        userBox.title = '';
      }
    } catch (e) {
      console.error('Failed to parse user session', e);
    }
  } else {
    // 2. 로그인 안 되어 있는 경우 (Guest)
    if (userBox) {
      userBox.style.cursor = 'pointer';
      userBox.title = '로그인하려면 클릭하세요';
      userBox.onclick = () => {
        location.href = 'login.html';
      };
    }
  }
}

function init() {
  checkSession();

  load();
  if (state.isMobile) {
    collapse();
  } else {
    resetWidth();
  }
  renderTrees();
  renderTrash();
  if (!location.hash) {
    navigateTo('welcome');
  } else {
    syncFromLocation();
  }
  const ld = $('#lastEdited');
  if (ld) ld.textContent = new Date().toLocaleDateString();
  syncMenuBtnVisibility();
}

init();
