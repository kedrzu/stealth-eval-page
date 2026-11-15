'use strict';

/*
 * Shared script of the made-up shop. Sections: utilities, eval state, reCAPTCHA, input recording, eval widget,
 * layout, cookie modal, navigation, pages, init. The only network calls are Google's reCAPTCHA script (in the HTML)
 * and the assessment request in assess().
 */

const SITE_KEY = '6LeHciEuAAAAAJSL9I_rLsgkmxdwe5IL27QfR_dv';
const API_KEY = 'AIzaSyCq5QfwVUqEDmzWOu1GQESiupKfJ-ySkXM';
const ASSESS_URL = `https://recaptchaenterprise.googleapis.com/v1/projects/poweragents-stealth-eval/assessments?key=${API_KEY}`;

const KEY = { visit: 'eval-visit', pending: 'eval-pending', cookie: 'cookie-choice', cart: 'shop-cart', lastList: 'last-list' };
const MAX_INPUT_RECORDS = 500;
const NAV_WAIT_MS = 1500;
const TOKEN_TIMEOUT_MS = 10000;
const TOKEN_MAX_AGE_MS = 110000;
const READ_MIN_MS = 10000;
const READ_MIN_COVERAGE = 0.8;
const PAGE_SIZE = 12;

const pageName = document.body.dataset.page;
let unloading = false;
let resetting = false;

/* Utilities */

function esc(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readJson(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the visit simply does not persist across pages.
  }
}

function formatPrice(price) {
  return `$${price.toFixed(2)}`;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

/* Eval state: one JSON document in sessionStorage, mirrored into the DOM */

function loadVisit() {
  const stored = readJson(sessionStorage, KEY.visit, null);
  if (stored && stored.version === 1) return stored;
  return { version: 1, visitId: newId(), startedAt: nowIso(), userAgent: navigator.userAgent, actions: [], input: [] };
}

function updateVisit(change) {
  const visit = loadVisit();
  change(visit);
  writeJson(sessionStorage, KEY.visit, visit);
  renderResults(visit);
}

function addInputRecord(record) {
  updateVisit((visit) => {
    if (visit.input.length < MAX_INPUT_RECORDS) visit.input.push(record);
  });
}

function renderResults(visit) {
  let element = document.getElementById('eval-results');
  if (!element) {
    element = document.createElement('script');
    element.type = 'application/json';
    element.id = 'eval-results';
    document.body.append(element);
  }
  element.textContent = JSON.stringify(visit);
  renderWidgetSummary(visit);
}

/* reCAPTCHA: a token per action, assessed at once */

function requestToken(action) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('reCAPTCHA timed out')), TOKEN_TIMEOUT_MS);
    const done = (callback, value) => {
      clearTimeout(timer);
      callback(value);
    };
    if (!window.grecaptcha || !window.grecaptcha.enterprise) {
      done(reject, new Error('reCAPTCHA not loaded'));
      return;
    }
    window.grecaptcha.enterprise.ready(() => {
      window.grecaptcha.enterprise.execute(SITE_KEY, { action }).then(
        (token) => done(resolve, token),
        (error) => done(reject, new Error(errorMessage(error))),
      );
    });
  });
}

async function fetchAssessment(action, token) {
  const response = await fetch(ASSESS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: { token, siteKey: SITE_KEY, expectedAction: action } }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body.error && body.error.message) || `HTTP ${response.status}`);
  return body;
}

function readAssessment(body, action) {
  const props = body.tokenProperties || {};
  const risk = body.riskAnalysis || {};
  let error = null;
  if (props.valid === false) error = `invalid token: ${props.invalidReason}`;
  else if (props.action && props.action !== action) error = `action mismatch: ${props.action}`;
  return {
    score: typeof risk.score === 'number' ? risk.score : null,
    reasons: risk.reasons || [],
    valid: typeof props.valid === 'boolean' ? props.valid : null,
    error,
  };
}

function finishEntry(index, result) {
  updateVisit((visit) => Object.assign(visit.actions[index] || {}, result));
}

function loadPending() {
  return readJson(sessionStorage, KEY.pending, []);
}

function addPending(item) {
  writeJson(sessionStorage, KEY.pending, [...loadPending(), item]);
}

function removePending(index) {
  writeJson(sessionStorage, KEY.pending, loadPending().filter((item) => item.index !== index));
}

async function assess(item) {
  let result;
  try {
    result = readAssessment(await fetchAssessment(item.action, item.token), item.action);
  } catch (error) {
    // A request cut off by an unexpected navigation stays pending; the next page reports it as lost.
    if (unloading) return;
    result = { error: errorMessage(error) };
  }
  finishEntry(item.index, result);
  removePending(item.index);
}

/**
 * Starts an action; the promise settles when the token is in hand. The assessment runs in the background, or, for an
 * action that navigates (`deferAssessment`), on the next page: a request cut off by navigation may already have
 * consumed the token, and a token can be assessed only once.
 */
function track(action, { deferAssessment = false } = {}) {
  let index = 0;
  updateVisit((visit) => {
    index = visit.actions.push({ action, page: pageName, at: nowIso(), score: null, reasons: [], valid: null, error: null }) - 1;
  });
  return requestToken(action).then(
    (token) => {
      const item = { index, action, token, at: Date.now(), deferred: deferAssessment };
      addPending(item);
      if (!deferAssessment) assess(item);
    },
    (error) => finishEntry(index, { error: errorMessage(error) }),
  );
}

function resumePending() {
  for (const item of loadPending()) {
    if (!item.deferred) {
      // Its request was in flight when the page unloaded; the token may be spent, so it is not sent again.
      finishEntry(item.index, { error: 'assessment cut off by navigation' });
      removePending(item.index);
    } else if (Date.now() - item.at > TOKEN_MAX_AGE_MS) {
      finishEntry(item.index, { error: 'token expired before assessment' });
      removePending(item.index);
    } else {
      assess(item);
    }
  }
}

/* Input recording: capture-phase passive listeners; text content is never read, only its length */

const motion = { moves: 0, path: 0, last: null, lastAt: null };
const scrollStats = { wheel: 0, scroll: 0, maxPct: 0 };
let session = null;
let pointerDownAt = 0;

function describeElement(element) {
  const parts = [];
  for (let el = element; el && el !== document.body && parts.length < 3; el = el.parentElement) {
    const test = el.getAttribute('data-test');
    const tag = el.tagName.toLowerCase();
    if (el.id) return [`${tag}#${el.id}`, ...parts].reverse().join(' > ');
    if (test) return [`${tag}[data-test=${test}]`, ...parts].reverse().join(' > ');
    const cls = el.classList[0];
    parts.push(cls ? `${tag}.${cls}` : tag);
  }
  return parts.reverse().join(' > ');
}

function recordMove(event) {
  if (motion.last) motion.path += Math.hypot(event.clientX - motion.last.x, event.clientY - motion.last.y);
  motion.last = { x: event.clientX, y: event.clientY };
  motion.moves += 1;
  motion.lastAt = performance.now();
}

function recordClick(event) {
  const target = event.target instanceof Element ? event.target : document.documentElement;
  const rect = target.getBoundingClientRect();
  const round = (value) => Math.round(value * 10) / 10;
  addInputRecord({
    kind: 'click',
    at: nowIso(),
    target: describeElement(target),
    isTrusted: event.isTrusted,
    pointerType: event.pointerType || '',
    mouseMovesBefore: motion.moves,
    pathPxBefore: round(motion.path),
    msSinceLastMove: motion.lastAt === null ? null : Math.round(performance.now() - motion.lastAt),
    offsetFromCenter: { x: round(event.clientX - (rect.left + rect.width / 2)), y: round(event.clientY - (rect.top + rect.height / 2)) },
  });
  motion.moves = 0;
  motion.path = 0;
}

function onPointerDown(event) {
  pointerDownAt = performance.now();
  recordClick(event);
}

function onClick(event) {
  // A click that follows a pointerdown is already recorded; this catches clicks made without one.
  if (performance.now() - pointerDownAt < 10000) {
    pointerDownAt = 0;
    return;
  }
  recordClick(event);
}

const TEXT_TYPES = new Set(['text', 'search', 'email', 'tel', 'url', 'password', 'number']);

function isTextField(element) {
  return element instanceof HTMLTextAreaElement || (element instanceof HTMLInputElement && TEXT_TYPES.has(element.type));
}

function startSession(element) {
  endSession();
  session = { element, keydowns: 0, inputs: 0, withoutKey: 0, pastes: 0, lastKeyAt: null, intervals: [] };
}

function endSession() {
  if (!session) return;
  const { element, keydowns, inputs, withoutKey, pastes, intervals } = session;
  session = null;
  const chars = element.value.length;
  if (!keydowns && !inputs && !pastes && !chars) return;
  const mean = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null;
  addInputRecord({
    kind: 'text',
    at: nowIso(),
    target: describeElement(element),
    chars,
    keydowns,
    inputEvents: inputs,
    insertTextWithoutKey: withoutKey,
    pastes,
    meanKeyIntervalMs: mean,
    minKeyIntervalMs: intervals.length ? Math.round(Math.min(...intervals)) : null,
  });
}

function onFocusIn(event) {
  if (isTextField(event.target)) startSession(event.target);
}

function onKeyDown(event) {
  if (!session || event.target !== session.element) return;
  const now = performance.now();
  session.keydowns += 1;
  if (session.lastKeyAt !== null) session.intervals.push(now - session.lastKeyAt);
  session.lastKeyAt = now;
}

function onInput(event) {
  if (!session || event.target !== session.element) return;
  session.inputs += 1;
  const sinceKey = session.lastKeyAt === null ? Infinity : performance.now() - session.lastKeyAt;
  if (event.inputType === 'insertText' && sinceKey > 50) session.withoutKey += 1;
}

function onPaste(event) {
  if (session && event.target === session.element) session.pastes += 1;
}

function onScroll() {
  scrollStats.scroll += 1;
  updateMaxScroll();
}

function updateMaxScroll() {
  const doc = document.documentElement;
  const pct = ((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100;
  scrollStats.maxPct = Math.max(scrollStats.maxPct, Math.min(100, Math.round(pct)));
}

function writeScrollRecord() {
  addInputRecord({ kind: 'scroll', at: nowIso(), page: pageName, wheelEvents: scrollStats.wheel, scrollEvents: scrollStats.scroll, maxScrollPct: scrollStats.maxPct });
  scrollStats.wheel = 0;
  scrollStats.scroll = 0;
}

function onPageHide() {
  unloading = true;
  if (resetting) return;
  endSession();
  writeScrollRecord();
}

function startRecording() {
  const options = { capture: true, passive: true };
  document.addEventListener('mousemove', recordMove, options);
  document.addEventListener('pointerdown', onPointerDown, options);
  document.addEventListener('click', onClick, options);
  document.addEventListener('focusin', onFocusIn, options);
  document.addEventListener('keydown', onKeyDown, options);
  document.addEventListener('input', onInput, options);
  document.addEventListener('paste', onPaste, options);
  document.addEventListener('wheel', () => (scrollStats.wheel += 1), options);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('beforeunload', () => (unloading = true));
  updateMaxScroll();
}

/* Eval widget: collapsed panel with the summary, copy and reset */

function renderWidgetSummary(visit) {
  const summary = document.getElementById('eval-summary');
  if (!summary) return;
  const scores = visit.actions.map((a) => a.score).filter((s) => typeof s === 'number');
  const mean = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 'n/a';
  summary.textContent = `Actions: ${visit.actions.length}, scored: ${scores.length}, mean score: ${mean}`;
}

function selectFallback(text) {
  const area = document.getElementById('eval-fallback');
  area.hidden = false;
  area.value = text;
  area.focus();
  area.select();
}

async function copyResults() {
  const text = document.getElementById('eval-results').textContent;
  const status = document.getElementById('eval-status');
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = 'Copied.';
  } catch {
    selectFallback(text);
    status.textContent = 'Press Ctrl+C to copy the selected text.';
  }
}

function resetVisit() {
  resetting = true;
  sessionStorage.clear();
  location.reload();
}

function toggleWidget(event) {
  const panel = document.getElementById('eval-panel');
  panel.hidden = !panel.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
}

function renderWidget() {
  const widget = document.createElement('div');
  widget.className = 'eval-widget';
  widget.id = 'eval-widget';
  widget.innerHTML =
    '<button type="button" id="eval-toggle" class="eval-widget__toggle" aria-expanded="false" aria-controls="eval-panel">Eval data</button>' +
    '<div id="eval-panel" class="eval-widget__panel" hidden>' +
    '<p id="eval-summary" aria-live="polite"></p>' +
    '<p><button type="button" id="copy-results">Copy results</button><button type="button" id="reset-visit">Reset visit</button></p>' +
    '<p id="eval-status" aria-live="polite"></p>' +
    '<textarea id="eval-fallback" rows="4" readonly hidden aria-label="Results JSON"></textarea></div>';
  document.body.append(widget);
  document.getElementById('eval-toggle').addEventListener('click', toggleWidget);
  document.getElementById('copy-results').addEventListener('click', copyResults);
  document.getElementById('reset-visit').addEventListener('click', resetVisit);
}

/* Layout: header and footer shared by every page */

function cartCount() {
  return readJson(localStorage, KEY.cart, { count: 0 }).count;
}

function renderCartCount() {
  const element = document.getElementById('cart-count');
  if (element) element.textContent = String(cartCount());
}

function renderHeader() {
  document.getElementById('site-header').innerHTML =
    '<div class="container site-header__row">' +
    '<a class="site-logo" href="index.html" data-test="logo">Beanwright</a>' +
    '<nav class="site-nav" aria-label="Main"><a href="index.html" data-test="nav-shop">Shop</a><a href="order.html" data-test="nav-order">Order</a></nav>' +
    '<form class="site-search" id="search-form" role="search" action="index.html">' +
    '<label class="visually-hidden" for="search-input">Search products</label>' +
    '<input type="search" id="search-input" name="q" placeholder="Search grinders, kettles, scales" autocomplete="off">' +
    '<button type="submit" class="btn" id="search-submit">Search</button></form>' +
    '<a class="site-cart" id="cart-link" href="order.html">Cart (<span id="cart-count">0</span>)</a></div>';
  document.getElementById('search-form').addEventListener('submit', onSearchSubmit);
  renderCartCount();
}

function renderFooter() {
  document.getElementById('site-footer').innerHTML =
    '<div class="container"><p>Beanwright, coffee and tea gear for the home counter.</p>' +
    '<p>Free delivery over $75. Thirty-day returns on unused items.</p>' +
    '<p>This is a demo shop: nothing here is for sale and no order is sent anywhere.</p></div>';
}

/* Cookie modal: once per browser session, blocks the page until a choice is made */

const BLOCKED_BY_MODAL = ['site-header', 'page-main', 'site-footer', 'eval-widget'];

function setModalBlocking(blocked) {
  document.body.classList.toggle('modal-open', blocked);
  for (const id of BLOCKED_BY_MODAL) {
    const element = document.getElementById(id);
    if (element) element.inert = blocked;
  }
}

function chooseCookies(action, choice) {
  track(action);
  sessionStorage.setItem(KEY.cookie, choice);
  document.getElementById('cookie-overlay').remove();
  setModalBlocking(false);
}

function toggleCookieSettings() {
  const settings = document.getElementById('cookie-settings');
  settings.hidden = !settings.hidden;
  document.getElementById('cookie-save').hidden = settings.hidden;
  document.getElementById('cookie-settings-toggle').setAttribute('aria-expanded', String(!settings.hidden));
}

function saveCookieSettings() {
  const any = document.getElementById('cookie-analytics').checked || document.getElementById('cookie-marketing').checked;
  chooseCookies(any ? 'cookie_accept' : 'cookie_reject', any ? 'custom' : 'rejected');
}

function showCookieModal() {
  if (sessionStorage.getItem(KEY.cookie)) return;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'cookie-overlay';
  overlay.innerHTML =
    '<div class="modal" id="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-title">' +
    '<h2 id="cookie-title">Your privacy</h2>' +
    '<p>This shop stores your cart and preferences in your browser. Choose which optional storage you allow.</p>' +
    '<div id="cookie-settings" hidden>' +
    '<label class="check"><input type="checkbox" checked disabled> Necessary (cart)</label>' +
    '<label class="check"><input type="checkbox" id="cookie-analytics"> Statistics</label>' +
    '<label class="check"><input type="checkbox" id="cookie-marketing"> Marketing</label></div>' +
    '<div class="modal__actions">' +
    '<button type="button" class="btn" id="cookie-accept">Accept all</button>' +
    '<button type="button" class="btn btn--ghost" id="cookie-reject">Reject</button>' +
    '<button type="button" class="btn btn--ghost" id="cookie-settings-toggle" aria-expanded="false" aria-controls="cookie-settings">Settings</button>' +
    '<button type="button" class="btn" id="cookie-save" hidden>Save settings</button></div></div>';
  document.body.append(overlay);
  setModalBlocking(true);
  document.getElementById('cookie-accept').addEventListener('click', () => chooseCookies('cookie_accept', 'all'));
  document.getElementById('cookie-reject').addEventListener('click', () => chooseCookies('cookie_reject', 'rejected'));
  document.getElementById('cookie-settings-toggle').addEventListener('click', toggleCookieSettings);
  document.getElementById('cookie-save').addEventListener('click', saveCookieSettings);
  document.getElementById('cookie-accept').focus();
}

/* Navigation: request the token first, then navigate (after the token or NAV_WAIT_MS) */

async function navigateAfter(action, url) {
  await Promise.race([track(action, { deferAssessment: true }), sleep(NAV_WAIT_MS)]);
  unloading = true;
  location.href = url;
}

function onNavLinkClick(event) {
  const link = event.target instanceof Element ? event.target.closest('a[data-nav-action]') : null;
  const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  if (!link || event.defaultPrevented || !plain) return;
  event.preventDefault();
  navigateAfter(link.dataset.navAction, link.href);
}

function onSearchSubmit(event) {
  event.preventDefault();
  const q = document.getElementById('search-input').value.trim();
  navigateAfter('search', q ? `index.html?q=${encodeURIComponent(q)}` : 'index.html');
}

/* List page */

function readListState() {
  const params = new URLSearchParams(location.search);
  return {
    q: (params.get('q') || '').trim(),
    cats: (params.get('cat') || '').split(',').filter((cat) => cat in CATEGORIES),
    brand: params.get('brand') || '',
    min: params.get('min') || '',
    max: params.get('max') || '',
    stock: params.get('stock') === '1',
    sort: params.get('sort') || 'relevance',
    page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
  };
}

function listUrl(state, changes) {
  const s = { ...state, ...changes };
  const params = new URLSearchParams();
  if (s.q) params.set('q', s.q);
  if (s.cats.length) params.set('cat', s.cats.join(','));
  if (s.brand) params.set('brand', s.brand);
  if (s.min) params.set('min', s.min);
  if (s.max) params.set('max', s.max);
  if (s.stock) params.set('stock', '1');
  if (s.sort !== 'relevance') params.set('sort', s.sort);
  if (s.page > 1) params.set('page', String(s.page));
  const query = params.toString();
  return query ? `index.html?${query}` : 'index.html';
}

function matchesState(product, state) {
  const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = `${product.name} ${product.brand} ${CATEGORIES[product.category]} ${product.short}`.toLowerCase();
  if (!words.every((word) => haystack.includes(word))) return false;
  if (state.cats.length && !state.cats.includes(product.category)) return false;
  if (state.brand && product.brand !== state.brand) return false;
  if (state.min !== '' && product.price < Number(state.min)) return false;
  if (state.max !== '' && product.price > Number(state.max)) return false;
  return !(state.stock && !product.inStock);
}

const SORTERS = {
  relevance: () => 0,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating,
  name: (a, b) => a.name.localeCompare(b.name),
};

function cardHtml(product) {
  const href = `product.html?id=${encodeURIComponent(product.id)}`;
  const stock = product.inStock ? '<span class="stock">In stock</span>' : '<span class="stock stock--out">Out of stock</span>';
  return (
    `<article class="card" data-test="product-card-${product.id}">` +
    `<a class="card__image" href="${href}" data-nav-action="open_product" tabindex="-1" aria-hidden="true">${productImage(product, 0)}</a>` +
    '<div class="card__body">' +
    `<span class="card__brand">${esc(product.brand)}</span>` +
    `<h2 class="card__title"><a href="${href}" data-test="product-link-${product.id}" data-nav-action="open_product">${esc(product.name)}</a></h2>` +
    `<p class="card__short">${esc(product.short)}</p>` +
    `<div class="card__meta"><span class="price">${formatPrice(product.price)}</span>` +
    `<span class="rating" aria-label="Rated ${product.rating} out of 5">&#9733; ${product.rating.toFixed(1)}</span></div>${stock}</div></article>`
  );
}

function paginationHtml(state, pages) {
  const link = (page, label, test, extra = '') =>
    `<a href="${listUrl(state, { page })}" data-test="${test}" data-nav-action="paginate" ${extra}>${label}</a>`;
  const off = (label, test) => `<span data-test="${test}" aria-disabled="true">${label}</span>`;
  const items = [state.page > 1 ? link(state.page - 1, 'Previous', 'page-prev', 'rel="prev"') : off('Previous', 'page-prev')];
  for (let page = 1; page <= pages; page += 1) {
    items.push(link(page, String(page), `page-${page}`, page === state.page ? 'aria-current="page"' : ''));
  }
  items.push(state.page < pages ? link(state.page + 1, 'Next', 'page-next', 'rel="next"') : off('Next', 'page-next'));
  return items.join('');
}

function fillFilterControls(state) {
  const brands = [...new Set(PRODUCTS.map((p) => p.brand))].sort();
  const select = document.getElementById('filter-brand');
  select.innerHTML = '<option value="">All brands</option>' + brands.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
  select.value = state.brand;
  for (const box of document.querySelectorAll('input[name=cat]')) box.checked = state.cats.includes(box.value);
  document.getElementById('filter-min').value = state.min;
  document.getElementById('filter-max').value = state.max;
  document.getElementById('filter-stock').checked = state.stock;
  document.getElementById('sort-select').value = state.sort in SORTERS ? state.sort : 'relevance';
  document.getElementById('search-input').value = state.q;
}

function onFilterSubmit(state, event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const changes = {
    cats: data.getAll('cat'),
    brand: data.get('brand') || '',
    min: String(data.get('min') || ''),
    max: String(data.get('max') || ''),
    stock: data.get('stock') === '1',
    page: 1,
  };
  navigateAfter('filter', listUrl(state, changes));
}

function initList() {
  const state = readListState();
  sessionStorage.setItem(KEY.lastList, location.href);
  fillFilterControls(state);
  const sorter = SORTERS[state.sort] || SORTERS.relevance;
  const results = PRODUCTS.filter((p) => matchesState(p, state)).sort(sorter);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const visible = results.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

  document.getElementById('list-title').textContent = state.q ? `Results for "${state.q}"` : 'All coffee gear';
  document.getElementById('results-count').textContent = `${results.length} product${results.length === 1 ? '' : 's'}`;
  document.getElementById('product-grid').innerHTML = visible.length ? visible.map(cardHtml).join('') : '<p id="no-results">No products match. Try fewer filters.</p>';
  document.getElementById('pagination').innerHTML = results.length ? paginationHtml(state, pages) : '';

  const form = document.getElementById('filter-form');
  form.addEventListener('submit', (event) => onFilterSubmit(state, event));
  form.addEventListener('change', (event) => {
    if (event.target.matches('input[type=checkbox], select')) form.requestSubmit();
  });
  document.getElementById('sort-select').addEventListener('change', (event) => navigateAfter('sort', listUrl(state, { sort: event.target.value, page: 1 })));
}

/* Product page */

function initProduct() {
  const id = new URLSearchParams(location.search).get('id');
  const product = PRODUCTS.find((p) => p.id === id);
  const main = document.getElementById('product-content');
  if (!product) {
    main.innerHTML = '<p id="product-missing">This product could not be found.</p><p><a href="index.html">Back to results</a></p>';
    return;
  }
  document.title = `${product.name} | Beanwright`;
  main.innerHTML = productHtml(product);
  initGallery(product);
  initTabs();
  initFaq();
  initBuy(product);
  watchDescription();
}

function productHtml(product) {
  const category = CATEGORIES[product.category];
  const back = sessionStorage.getItem(KEY.lastList) || 'index.html';
  const stock = product.inStock ? '<span class="stock">In stock</span>' : '<span class="stock stock--out">Out of stock</span>';
  return (
    '<nav class="breadcrumb" id="breadcrumb" aria-label="Breadcrumb"><ol>' +
    '<li><a href="index.html" data-test="crumb-shop">Shop</a></li>' +
    `<li><a href="index.html?cat=${product.category}" data-test="crumb-category">${esc(category)}</a></li>` +
    `<li aria-current="page">${esc(product.name)}</li></ol></nav>` +
    '<div class="product"><div class="gallery">' +
    '<figure class="gallery__main" id="gallery-main"></figure>' +
    '<div class="gallery__thumbs" id="gallery-thumbs"></div></div>' +
    '<div class="product__info">' +
    `<span class="card__brand">${esc(product.brand)}</span>` +
    `<h1 class="product__title" id="product-title">${esc(product.name)}</h1>` +
    `<span class="rating" aria-label="Rated ${product.rating} out of 5">&#9733; ${product.rating.toFixed(1)}</span> ${stock}` +
    `<p class="product__price">${formatPrice(product.price)}</p><p>${esc(product.short)}</p>` +
    '<div class="buy"><label for="qty-input">Quantity</label>' +
    '<input type="number" id="qty-input" min="1" max="20" value="1">' +
    '<button type="button" class="btn" id="add-to-cart">Add to cart</button></div>' +
    '<p class="cart-message" id="cart-message" role="status"></p>' +
    `<div class="product__links"><a class="btn btn--ghost" id="order-link" href="order.html?product=${encodeURIComponent(product.id)}" data-test="order-link">Order</a>` +
    `<a id="back-to-results" href="${esc(back)}" data-test="back-to-results">Back to results</a></div></div></div>` +
    tabsHtml(product) +
    faqHtml(product)
  );
}

function tabsHtml(product) {
  const description = product.description.map((p) => `<p>${esc(p)}</p>`).join('');
  const specs = product.specs.map(([key, value]) => `<tr><th scope="row">${esc(key)}</th><td>${esc(value)}</td></tr>`).join('');
  const reviews = product.reviews
    .map((r) => `<div class="review"><h3>${esc(r.title)}</h3><p class="rating" aria-label="Rated ${r.rating} out of 5">${'&#9733;'.repeat(r.rating)}</p><p>${esc(r.text)}</p><p class="card__brand">${esc(r.author)}</p></div>`)
    .join('');
  const tab = (name, label, selected) =>
    `<button type="button" role="tab" class="tabs__tab" id="tab-${name}" data-tab="${name}" aria-controls="panel-${name}" aria-selected="${selected}">${label}</button>`;
  return (
    '<section class="tabs" aria-label="Product information">' +
    `<div class="tabs__list" role="tablist">${tab('description', 'Description', true)}${tab('specs', 'Specifications', false)}${tab('reviews', 'Reviews', false)}</div>` +
    `<div class="tabs__panel" role="tabpanel" id="panel-description" aria-labelledby="tab-description"><div id="description-text">${description}</div></div>` +
    `<div class="tabs__panel" role="tabpanel" id="panel-specs" aria-labelledby="tab-specs" hidden><table class="specs"><tbody>${specs}</tbody></table></div>` +
    `<div class="tabs__panel" role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews" hidden>${reviews}</div></section>`
  );
}

function faqHtml(product) {
  const items = product.faq
    .map(([q, a], i) => `<details id="faq-${i + 1}-item"><summary data-test="faq-${i + 1}">${esc(q)}</summary><p>${esc(a)}</p></details>`)
    .join('');
  return `<section class="faq" id="faq" aria-labelledby="faq-title"><h2 id="faq-title">Questions and answers</h2>${items}</section>`;
}

function initGallery(product) {
  let current = 0;
  const count = product.images;
  const mainEl = document.getElementById('gallery-main');
  const thumbs = document.getElementById('gallery-thumbs');
  thumbs.innerHTML = Array.from(
    { length: count },
    (_, i) => `<button type="button" class="gallery__thumb" data-test="gallery-thumb-${i + 1}" aria-label="Show image ${i + 1} of ${count}">${productImage(product, i)}</button>`,
  ).join('');
  mainEl.innerHTML =
    '<div id="gallery-image"></div>' +
    '<button type="button" class="gallery__btn gallery__btn--prev" data-test="gallery-prev" aria-label="Previous image">&#8249;</button>' +
    '<button type="button" class="gallery__btn gallery__btn--next" data-test="gallery-next" aria-label="Next image">&#8250;</button>' +
    '<span class="gallery__count" id="gallery-count" aria-live="polite"></span>';

  const show = (index, fromUser) => {
    current = (index + count) % count;
    document.getElementById('gallery-image').innerHTML = productImage(product, current);
    document.getElementById('gallery-count').textContent = `${current + 1} / ${count}`;
    thumbs.querySelectorAll('.gallery__thumb').forEach((btn, i) => btn.setAttribute('aria-current', String(i === current)));
    if (fromUser) track('gallery');
  };
  show(0, false);
  mainEl.querySelector('[data-test=gallery-prev]').addEventListener('click', () => show(current - 1, true));
  mainEl.querySelector('[data-test=gallery-next]').addEventListener('click', () => show(current + 1, true));
  thumbs.addEventListener('click', (event) => {
    const thumb = event.target instanceof Element ? event.target.closest('.gallery__thumb') : null;
    if (thumb) show([...thumbs.children].indexOf(thumb), true);
  });
}

function initTabs() {
  const tabs = [...document.querySelectorAll('[role=tab]')];
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      for (const other of tabs) {
        const selected = other === tab;
        other.setAttribute('aria-selected', String(selected));
        document.getElementById(`panel-${other.dataset.tab}`).hidden = !selected;
      }
      track('tab');
    });
  }
}

function initFaq() {
  for (const details of document.querySelectorAll('.faq details')) {
    details.addEventListener('toggle', () => {
      if (details.open) track('faq');
    });
  }
}

function addToCart(quantity) {
  const cart = readJson(localStorage, KEY.cart, { count: 0 });
  cart.count += quantity;
  writeJson(localStorage, KEY.cart, cart);
  renderCartCount();
}

function initBuy(product) {
  document.getElementById('add-to-cart').addEventListener('click', () => {
    const input = document.getElementById('qty-input');
    const quantity = Math.min(20, Math.max(1, parseInt(input.value, 10) || 1));
    input.value = String(quantity);
    addToCart(quantity);
    document.getElementById('cart-message').textContent = `Added ${quantity} x ${product.name} to your cart.`;
    track('add_to_cart');
  });
}

/** Fires read_description once: at least 80% of the description scrolled into view and 10 s on the page. */
function watchDescription() {
  const element = document.getElementById('description-text');
  const startedAt = performance.now();
  let coverage = 0;
  let fired = false;
  const check = () => {
    if (fired) return;
    const rect = element.getBoundingClientRect();
    if (rect.height > 0) coverage = Math.max(coverage, Math.min(1, Math.max(0, (window.innerHeight - rect.top) / rect.height)));
    if (coverage >= READ_MIN_COVERAGE && performance.now() - startedAt >= READ_MIN_MS) {
      fired = true;
      track('read_description');
    }
  };
  window.addEventListener('scroll', check, { passive: true });
  setInterval(check, 1000);
}

/* Order page */

const PAYMENTS = ['card', 'transfer', 'cash'];

function todayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function validateOrder(form) {
  const value = (name) => form.elements[name].value.trim();
  const errors = {};
  if (value('name').length < 2) errors.name = 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value('email'))) errors.email = 'Enter a valid email address.';
  if (value('phone').replace(/\D/g, '').length < 7) errors.phone = 'Enter a phone number with at least 7 digits.';
  if (!value('delivery')) errors.delivery = 'Choose a delivery method.';
  if (!PAYMENTS.includes(form.elements.payment.value)) errors.payment = 'Choose a payment method.';
  if (!value('date')) errors.date = 'Choose a delivery date.';
  else if (value('date') < todayString()) errors.date = 'The delivery date cannot be in the past.';
  if (!form.elements.terms.checked) errors.terms = 'You need to accept the terms to place the order.';
  return errors;
}

function showOrderErrors(errors) {
  for (const field of ['name', 'email', 'phone', 'delivery', 'payment', 'date', 'terms']) {
    const message = document.getElementById(`order-${field}-error`);
    const message_text = errors[field] || '';
    message.textContent = message_text;
    message.hidden = !message_text;
    const control = document.getElementById(`order-${field}`);
    if (control) control.setAttribute('aria-invalid', String(Boolean(message_text)));
  }
}

function onOrderSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errors = validateOrder(form);
  showOrderErrors(errors);
  const firstInvalid = Object.keys(errors)[0];
  if (firstInvalid) {
    track('order_invalid');
    const focusTarget = document.getElementById(`order-${firstInvalid}`) || form.querySelector('input[name=payment]');
    focusTarget.focus();
    return;
  }
  track('order_submit');
  writeJson(localStorage, KEY.cart, { count: 0 });
  renderCartCount();
  form.hidden = true;
  const confirmation = document.getElementById('order-confirmation');
  document.getElementById('order-reference').textContent = `BW-${Math.floor(10000 + Math.random() * 90000)}`;
  confirmation.hidden = false;
  confirmation.focus();
}

function initOrder() {
  const form = document.getElementById('order-form');
  const date = document.getElementById('order-date');
  date.min = todayString();
  const product = PRODUCTS.find((p) => p.id === new URLSearchParams(location.search).get('product'));
  const summary = document.getElementById('order-summary');
  summary.textContent = product ? `You are ordering: ${product.name} (${formatPrice(product.price)})` : 'Tell us what you would like and where to send it.';
  form.addEventListener('submit', onOrderSubmit);
}

/* Init */

const PAGES = { list: ['page_list', initList], product: ['page_product', initProduct], order: ['page_order', initOrder] };

function init() {
  renderHeader();
  renderFooter();
  renderWidget();
  renderResults(loadVisit());
  startRecording();
  document.addEventListener('click', onNavLinkClick);
  const [action, start] = PAGES[pageName];
  start();
  resumePending();
  track(action);
  showCookieModal();
}

init();
