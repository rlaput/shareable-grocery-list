(function () {
  'use strict';

  var STORAGE_KEY = 'grocery-list.v1';

  var form = document.getElementById('add-form');
  var input = document.getElementById('item-input');
  var listEl = document.getElementById('list');
  var emptyEl = document.getElementById('empty');
  var summaryEl = document.getElementById('summary');
  var clearDoneBtn = document.getElementById('clear-done');
  var shareBtn = document.getElementById('share-btn');
  var toastEl = document.getElementById('toast');
  var dialog = document.getElementById('import-dialog');
  var dialogDesc = document.getElementById('import-desc');

  // Each item: { id: string, text: string, done: boolean }
  var items = load();

  // ---------- Storage ----------

  function load() {
    try {
      return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // Storage full or blocked (e.g. private mode) — the list still works for this session.
    }
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Accepts stored items, shared [text, done] pairs, or plain strings.
  function sanitize(raw) {
    if (!Array.isArray(raw)) return [];
    var out = [];
    raw.forEach(function (entry) {
      var text, done;
      if (typeof entry === 'string') {
        text = entry; done = false;
      } else if (Array.isArray(entry)) {
        text = entry[0]; done = !!entry[1];
      } else if (entry && typeof entry === 'object') {
        text = entry.text; done = !!entry.done;
      }
      if (typeof text !== 'string') return;
      text = text.trim().slice(0, 120);
      if (!text) return;
      out.push({
        id: entry && typeof entry.id === 'string' ? entry.id : newId(),
        text: text,
        done: done
      });
    });
    return out;
  }

  // ---------- Rendering ----------

  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var X_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function render() {
    listEl.textContent = '';
    var frag = document.createDocumentFragment();

    items.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'item' + (item.done ? ' done' : '');
      li.dataset.id = item.id;

      var main = document.createElement('button');
      main.type = 'button';
      main.className = 'item-main';
      main.setAttribute('role', 'checkbox');
      main.setAttribute('aria-checked', String(item.done));

      var check = document.createElement('span');
      check.className = 'check';
      check.innerHTML = CHECK_SVG;

      var text = document.createElement('span');
      text.className = 'item-text';
      text.textContent = item.text;

      main.appendChild(check);
      main.appendChild(text);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'delete-btn';
      del.setAttribute('aria-label', 'Delete ' + item.text);
      del.innerHTML = X_SVG;

      li.appendChild(main);
      li.appendChild(del);
      frag.appendChild(li);
    });

    listEl.appendChild(frag);

    var total = items.length;
    var done = items.filter(function (i) { return i.done; }).length;
    emptyEl.hidden = total > 0;
    clearDoneBtn.hidden = done === 0;
    summaryEl.textContent = total === 0 ? '' :
      done === 0 ? total + (total === 1 ? ' item' : ' items') :
      done + ' of ' + total + ' collected';
  }

  function commit() {
    save();
    render();
  }

  // ---------- Actions ----------

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) { input.focus(); return; }
    items.push({ id: newId(), text: text.slice(0, 120), done: false });
    input.value = '';
    commit();
    input.focus(); // keep the keyboard up for rapid entry
  });

  listEl.addEventListener('click', function (e) {
    var li = e.target.closest('.item');
    if (!li) return;
    var idx = items.findIndex(function (i) { return i.id === li.dataset.id; });
    if (idx < 0) return;

    if (e.target.closest('.delete-btn')) {
      items.splice(idx, 1);
    } else if (e.target.closest('.item-main')) {
      items[idx].done = !items[idx].done;
    } else {
      return;
    }
    commit();
  });

  clearDoneBtn.addEventListener('click', function () {
    items = items.filter(function (i) { return !i.done; });
    commit();
  });

  // ---------- Base64 (UTF-8 & URL safe) ----------
  // btoa/atob only handle Latin-1, so text is converted to UTF-8 bytes first
  // (keeps emoji and accents like "jalapeño" working). The output uses the
  // URL-safe alphabet (-_ instead of +/, no padding) so it never gets mangled
  // in a query string.

  function encodeData(value) {
    var bytes = new TextEncoder().encode(JSON.stringify(value));
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeData(str) {
    // Also accept standard Base64, where "+" may have turned into a space.
    var b64 = str.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  // ---------- Share ----------

  function buildShareUrl() {
    // Compact payload: [["Milk",0],["Eggs",1]]
    var payload = items.map(function (i) { return [i.text, i.done ? 1 : 0]; });
    var url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('data', encodeData(payload));
    return url.toString();
  }

  shareBtn.addEventListener('click', function () {
    if (items.length === 0) {
      toast('Add some items first');
      input.focus();
      return;
    }
    var url = buildShareUrl();

    if (navigator.share) {
      navigator.share({ title: 'Grocery List', text: 'Here’s our grocery list:', url: url })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return; // user closed the share sheet
          copyLink(url);
        });
    } else {
      copyLink(url);
    }
  });

  function copyLink(url) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(
        function () { toast('Link copied to clipboard'); },
        function () { legacyCopy(url); }
      );
    } else {
      legacyCopy(url);
    }
  }

  function legacyCopy(url) {
    var ta = document.createElement('textarea');
    ta.value = url;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, url.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (ok) toast('Link copied to clipboard');
    else window.prompt('Copy this link:', url);
  }

  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2200);
  }

  // ---------- Auto-import ----------

  function clearDataParam() {
    var url = new URL(location.href);
    url.searchParams.delete('data');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function mergeInto(current, incoming) {
    var byText = {};
    current.forEach(function (i) { byText[i.text.toLowerCase()] = i; });
    var result = current.slice();
    incoming.forEach(function (i) {
      var key = i.text.toLowerCase();
      if (!byText[key]) {
        byText[key] = i;
        result.push(i);
      }
    });
    return result;
  }

  function askImport(incoming) {
    return new Promise(function (resolve) {
      var n = incoming.length;
      dialogDesc.textContent = 'It has ' + n + (n === 1 ? ' item' : ' items') +
        '. Merge this shared list with your current list or replace it?';
      dialog.hidden = false;
      dialog.querySelector('[data-choice="merge"]').focus();

      function onClick(e) {
        var btn = e.target.closest('[data-choice]');
        if (!btn && e.target !== dialog) return;
        dialog.removeEventListener('click', onClick);
        dialog.hidden = true;
        resolve(btn ? btn.dataset.choice : 'cancel');
      }
      dialog.addEventListener('click', onClick);
    });
  }

  function checkForSharedList() {
    var data = new URLSearchParams(location.search).get('data');
    if (!data) return;

    var incoming;
    try {
      incoming = sanitize(decodeData(data));
    } catch (e) {
      incoming = null;
    }
    if (!incoming || incoming.length === 0) {
      clearDataParam();
      toast('That shared link couldn’t be read');
      return;
    }

    // Nothing to merge with — just take the shared list.
    if (items.length === 0) {
      items = incoming;
      commit();
      clearDataParam();
      toast('Shared list loaded');
      return;
    }

    askImport(incoming).then(function (choice) {
      if (choice === 'merge') {
        items = mergeInto(items, incoming);
        toast('Lists merged');
      } else if (choice === 'replace') {
        items = incoming;
        toast('List replaced');
      }
      commit();
      clearDataParam();
    });
  }

  // Keep multiple open tabs in sync.
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) { items = load(); render(); }
  });

  render();
  checkForSharedList();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
