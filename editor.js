/* Mod editare. Se încarcă doar când adresa conține ?edit (vezi scriptul din <head>).
   Clientul scrie direct în pagină, duplică sau șterge blocuri, apoi apasă Exportă.
   Exportul e un fișier .html: o listă lizibilă cu modificările plus HTML-ul complet,
   înainte și după, în <script id="date-editare">. Pagina publică nu se schimbă.
   Ciorna se păstrează în localStorage, legată de versiunea paginii (pageHash). */
(function () {
  'use strict';

  var KEY = 'dr-editor-draft-v1';
  var HELP_KEY = 'dr-editor-help-v1';
  var REGIONS = [
    ['brand', '.top .brand', 'Antet'],
    ['nav', '.top .nav', 'Meniu'],
    ['meniu', '#meniu ol', 'Meniu pe telefon'],
    ['main', 'main', ''],
    ['footer', 'footer.foot', 'Subsol']
  ];
  /* Blocuri care se pot duplica sau șterge. Primul selector potrivit dă eticheta. */
  var BLOCKS = [
    ['main > section', function (el) { var s = el.getAttribute('data-sec') || ''; return 'Secțiunea ' + (SEC[s] || s); }],
    ['.faq details', 'Întrebare'],
    ['.primary > li', 'Temă'],
    ['.also', 'Lista "Alte teme"'],
    ['.also li', 'Temă'],
    ['.methods > div', 'Metodă'],
    ['.steps li', 'Pas'],
    ['.facts > div', 'Rând'],
    ['.scores li', 'Notă'],
    ['.creds li', 'Rând'],
    ['.reach li', 'Rând'],
    ['.actions > a', 'Buton'],
    ['.nav a, #meniu li', 'Link din meniu'],
    ['blockquote', 'Citat'],
    ['h1, h2', 'Titlu'],
    ['p', 'Paragraf'],
    ['figcaption, cite', 'Text']
  ];
  var SEC = { Hero: 'de început' };
  var ALL = BLOCKS.map(function (b) { return b[0]; }).join(',');
  var BLOCK_TAGS = /^(P|H[1-6]|LI|DT|DD|SUMMARY|DETAILS|BLOCKQUOTE|FOOTER|FIGCAPTION|FIGURE|CITE|ADDRESS|DIV|SECTION|UL|OL|DL|NAV|BUTTON)$/;
  var XHTML = 'http://www.w3.org/1999/xhtml';

  var regions = [];
  var base = {};
  var pageHash = '';
  var startedAt = 0;
  var active = null;
  var hovered = null;
  var saveTimer = 0;
  var stored = true;
  var ui = {};

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function keep(k, v) {
    try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function hash(obj) {
    var s = JSON.stringify(obj), h = 5381;
    for (var i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function button(text, cls, fn) {
    var b = el('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  /* ---------- HTML curat, fără urmele editorului ---------- */

  function cleanNode(n) {
    n.removeAttribute('contenteditable');
    n.removeAttribute('spellcheck');
    n.removeAttribute('aria-current');
    if (n.hasAttribute('class')) {
      [].slice.call(n.classList).forEach(function (k) { if (k.indexOf('ed-') === 0) n.classList.remove(k); });
      if (!n.classList.length) n.removeAttribute('class');
    }
  }
  function cleanHtml(node) {
    var c = node.cloneNode(true);
    [].slice.call(c.querySelectorAll('*')).forEach(cleanNode);
    return c.innerHTML;
  }
  function snapshot() {
    var o = {};
    regions.forEach(function (r) { o[r.name] = cleanHtml(r.el); });
    return o;
  }
  function apply(map) {
    regions.forEach(function (r) {
      if (typeof map[r.name] === 'string' && map[r.name] !== cleanHtml(r.el)) r.el.innerHTML = map[r.name];
    });
  }

  /* ---------- rezumat: textul paginii pe rânduri, apoi diferențele ---------- */

  function lines(map) {
    var out = [];
    regions.forEach(function (r) {
      var t = document.createElement('template');
      t.innerHTML = map[r.name] || '';
      var sec = r.label, buf = '';
      function flush() {
        var s = buf.replace(/\s+/g, ' ').trim();
        if (s) out.push({ t: s, s: sec });
        buf = '';
      }
      (function walk(n) {
        var block = false;
        if (n.nodeType === 3) { buf += n.nodeValue; return; }
        if (n.nodeType === 1) {
          if (n.namespaceURI !== XHTML || /^(SCRIPT|STYLE|IFRAME|IMG|PICTURE|SOURCE|TEMPLATE)$/.test(n.tagName)) return;
          if (n.tagName === 'BR') { flush(); return; }
          if (n.tagName === 'SPAN' || n.tagName === 'SMALL') buf += ' ';
          block = BLOCK_TAGS.test(n.tagName) || (n.tagName === 'A' && r.name !== 'main' && r.name !== 'footer');
          if (n.hasAttribute('data-sec')) { flush(); sec = SEC[n.getAttribute('data-sec')] || n.getAttribute('data-sec'); }
          if (block) flush();
        } else if (n.nodeType !== 11) return;
        for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
        if (block) flush();
      })(t.content);
      flush();
    });
    return out;
  }

  function diff(a, b) {
    var A = lines(a), B = lines(b), n = A.length, m = B.length, s = 0, e = 0;
    while (s < n && s < m && A[s].t === B[s].t) s++;
    while (e < n - s && e < m - s && A[n - 1 - e].t === B[m - 1 - e].t) e++;
    var X = A.slice(s, n - e), Y = B.slice(s, m - e), N = X.length, M = Y.length, dp = [], i, j;
    for (i = N; i >= 0; i--) {
      dp[i] = new Uint16Array(M + 1);
      if (i < N) for (j = M - 1; j >= 0; j--) {
        dp[i][j] = X[i].t === Y[j].t ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var out = [], cur = null;
    function add(list, item) {
      if (!cur) { cur = { s: item.s, before: [], after: [] }; out.push(cur); }
      cur[list].push(item.t);
    }
    i = 0; j = 0;
    while (i < N || j < M) {
      if (i < N && j < M && X[i].t === Y[j].t) { cur = null; i++; j++; }
      else if (j < M && (i === N || dp[i][j + 1] >= dp[i + 1][j])) { add('after', Y[j]); j++; }
      else { add('before', X[i]); i++; }
    }
    return out;
  }

  function plural(n) {
    if (!n) return 'Nicio modificare încă';
    if (n === 1) return '1 modificare';
    var r = n % 100;
    return n + (r >= 1 && r <= 19 ? ' ' : ' de ') + 'modificări';
  }

  /* ---------- salvare automată ---------- */

  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { refresh(true); }, 400);
    place();
  }

  function refresh(persist) {
    clearTimeout(saveTimer);
    saveTimer = 0;
    var edited = snapshot();
    var changes = diff(base, edited);
    var dirty = JSON.stringify(edited) !== JSON.stringify(base);
    if (persist) {
      if (!dirty) keep(KEY, null);
      else {
        var prev = load(KEY) || {};
        startedAt = startedAt || Date.now();
        stored = keep(KEY, { pageHash: pageHash, base: base, edited: edited, startedAt: startedAt, savedAt: Date.now(), exportedAt: prev.exportedAt || 0 });
      }
    }
    ui.status.textContent = plural(changes.length);
    ui.warn.hidden = stored || !dirty;
    return { edited: edited, changes: changes };
  }

  /* ---------- blocuri: selectare, duplicare, ștergere ---------- */

  function regionOf(n) {
    for (var i = 0; i < regions.length; i++) if (regions[i].el.contains(n)) return regions[i].el;
    return null;
  }
  function blockOf(node) {
    var n = node && (node.nodeType === 1 ? node : node.parentElement);
    var b = n && n.closest(ALL);
    if (!b) return null;
    var r = regionOf(b);
    return r && r !== b ? b : null;
  }
  function parentOf(b) { return b && b.parentElement ? blockOf(b.parentElement) : null; }
  function labelOf(b) {
    for (var i = 0; i < BLOCKS.length; i++) {
      if (b.matches(BLOCKS[i][0])) return typeof BLOCKS[i][1] === 'function' ? BLOCKS[i][1](b) : BLOCKS[i][1];
    }
    return 'Bloc';
  }

  function setActive(b) {
    if (active) active.classList.remove('ed-active');
    active = b;
    if (b) {
      b.classList.remove('ed-hover');
      b.classList.add('ed-active');
      ui.name.textContent = labelOf(b);
      ui.up.hidden = !parentOf(b);
    }
    place();
  }

  function place() {
    var c = ui.ctl;
    if (!c) return;
    if (!active || !active.isConnected) { c.style.display = 'none'; return; }
    var r = active.getBoundingClientRect();
    var head = document.querySelector('.top');
    var hb = head ? head.getBoundingClientRect().bottom : 0;
    var minY = Math.max(8, hb + 6);
    var maxY = innerHeight - (ui.bar.offsetHeight || 0) - 12;
    c.style.display = 'flex';
    var w = c.offsetWidth, h = c.offsetHeight;
    var y = r.top - h - 8;
    if (y < minY) y = Math.min(minY, r.bottom - h);
    if (r.bottom < minY || r.top > maxY - h) { c.style.display = 'none'; return; }
    var x = Math.min(Math.max(8, r.right - w), innerWidth - w - 8);
    c.style.top = y + 'px';
    c.style.left = x + 'px';
  }

  function stripCopy(n) {
    n.removeAttribute('id');
    cleanNode(n);
    [].slice.call(n.querySelectorAll('*')).forEach(function (k) { k.removeAttribute('id'); cleanNode(k); });
  }

  function duplicate() {
    if (!active) return;
    var src = active, name = labelOf(src);
    var copy = src.cloneNode(true);
    stripCopy(copy);
    src.parentNode.insertBefore(copy, src.nextSibling);
    copy.classList.add('ed-new');
    setTimeout(function () { copy.classList.remove('ed-new'); }, 1600);
    setActive(copy);
    queueSave();
    toast('Ai duplicat: ' + name + '. Copia e chiar dedesubt.', function () {
      if (active === copy) setActive(null);
      copy.remove();
      queueSave();
    });
    if (copy.scrollIntoView) copy.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function remove() {
    if (!active) return;
    var node = active, parent = node.parentNode, next = node.nextSibling, name = labelOf(node);
    setActive(null);
    node.remove();
    queueSave();
    toast('Ai șters: ' + name + '.', function () {
      parent.insertBefore(node, next && next.parentNode === parent ? next : null);
      setActive(node);
      queueSave();
    });
  }

  /* ---------- export ---------- */

  function stamp(d) {
    function p(x) { return (x < 10 ? '0' : '') + x; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }
  function when(d) {
    try { return d.toLocaleString('ro-RO', { dateStyle: 'long', timeStyle: 'short' }); }
    catch (e) { return d.toISOString(); }
  }

  function report(data, now) {
    var rows = data.changes.map(function (c) {
      return '<li><div class="sec">' + esc(c.s || 'Pagina') + '</div>' +
        c.before.map(function (t) { return '<p class="del"><b>Înainte</b>' + esc(t) + '</p>'; }).join('') +
        c.after.map(function (t) { return '<p class="add"><b>Acum</b>' + esc(t) + '</p>'; }).join('') +
        '</li>';
    }).join('');
    var css =
      'body{margin:0;background:#f3f8f7;color:#15333b;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
      'main{max-width:760px;margin:0 auto;padding:32px 16px 64px}' +
      'h1{font:500 1.7rem/1.2 Georgia,serif;margin:0 0 8px}' +
      '.meta{color:#4d6a70;margin:0 0 28px}' +
      'ol{margin:0;padding:0 0 0 1.4em;display:grid;gap:18px}' +
      'li{background:#fff;border:1px solid #d4e2dd;border-radius:8px;padding:12px 16px}' +
      '.sec{font-size:.8rem;font-weight:600;color:#4d6a70;margin-bottom:6px}' +
      'p{margin:6px 0}p b{display:inline-block;min-width:5.2em;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em}' +
      '.del{color:#8a2f2f;text-decoration:line-through;text-decoration-color:rgba(138,47,47,.5)}.del b{text-decoration:none}' +
      '.add{color:#1b6d58}' +
      '.note{margin-top:32px;color:#4d6a70;font-size:.9rem}';
    return '<!doctype html>\n<html lang="ro">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>Modificări pentru site-ul Danielei Rusev</title>\n<style>' + css + '</style>\n</head>\n<body>\n<main>\n' +
      '<h1>Modificări pentru site</h1>\n' +
      '<p class="meta">' + esc(data.page) + '<br>Exportat pe ' + esc(when(now)) + '. ' + esc(plural(data.changes.length)) + '.</p>\n' +
      (rows ? '<ol>' + rows + '</ol>\n' : '<p>Nicio modificare de text.</p>\n') +
      '<p class="note">Fișierul conține și pagina completă, înainte și după editare, ca Mario s-o poată actualiza exact. Trimite-l așa cum este.</p>\n' +
      '</main>\n<script type="application/json" id="date-editare">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>\n</body>\n</html>\n';
  }

  function download(text, name) {
    var url = URL.createObjectURL(new Blob([text], { type: 'text/html;charset=utf-8' }));
    var a = el('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  function exportFile() {
    var now = new Date();
    var res = refresh(true);
    var data = {
      format: 'dr-editor-1',
      page: location.origin + location.pathname,
      exportedAt: now.toISOString(),
      startedAt: startedAt ? new Date(startedAt).toISOString() : null,
      changes: res.changes,
      base: base,
      edited: res.edited
    };
    var doc = report(data, now);
    var name = 'modificari-site-daniela-rusev-' + stamp(now) + '.html';
    var d = load(KEY);
    if (d) { d.exportedAt = Date.now(); keep(KEY, d); }
    var file = null;
    try { file = new File([doc], name, { type: 'text/html' }); } catch (e) {}
    var touch = matchMedia('(pointer:coarse)').matches;
    if (file && touch && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Modificări site Daniela Rusev' }).then(function () {
        exported(doc, name, true);
      }, function (err) {
        if (err && err.name === 'AbortError') { exported(doc, name, false); return; }
        download(doc, name);
        exported(doc, name, false);
      });
    } else {
      download(doc, name);
      exported(doc, name, false);
    }
  }

  function exported(doc, name, shared) {
    var p = panel('Fișierul e gata');
    p.body.appendChild(el('p', '', shared
      ? 'L-ai trimis. Dacă nu a ajuns la Mario, îl poți descărca din nou de aici.'
      : 'Fișierul ' + name + ' s-a descărcat, de obicei în folderul Descărcări. Trimite-l lui Mario pe WhatsApp sau pe e-mail, ca atașament.'));
    p.body.appendChild(el('p', '', 'Modificările rămân salvate în acest browser. Poți continua să editezi și să exporți din nou oricând.'));
    p.actions.appendChild(button('Descarcă din nou', 'ed-btn', function () { download(doc, name); }));
    p.actions.appendChild(button('Închide', 'ed-btn ed-primary', p.close));
  }

  /* ---------- interfață ---------- */

  var toastTimer = 0;
  function toast(msg, undo) {
    clearTimeout(toastTimer);
    var t = ui.toast;
    t.textContent = '';
    t.appendChild(el('span', '', msg));
    if (undo) t.appendChild(button('Anulează', 'ed-link', function () { undo(); t.hidden = true; }));
    t.hidden = false;
    toastTimer = setTimeout(function () { t.hidden = true; }, 7000);
  }

  function panel(title, modal) {
    var wrap = el('div', 'ed-ui ' + (modal ? 'ed-modal' : 'ed-float'));
    var card = el('div', 'ed-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', title);
    card.appendChild(el('h2', '', title));
    var body = el('div', 'ed-body');
    var actions = el('div', 'ed-actions');
    card.appendChild(body);
    card.appendChild(actions);
    wrap.appendChild(card);
    if (ui.open) ui.open.remove();
    ui.open = wrap;
    document.body.appendChild(wrap);
    return {
      body: body,
      actions: actions,
      close: function () { wrap.remove(); if (ui.open === wrap) ui.open = null; }
    };
  }

  function showHelp() {
    var p = panel('Editezi pagina');
    [
      'Apasă pe orice text și scrie peste el. Tot ce schimbi se salvează singur, în acest browser.',
      'Când apeși pe un text, deasupra lui apare o bară mică. Duplică adaugă încă un bloc la fel chiar dedesubt. Șterge îl scoate din pagină. Săgeata ↑ selectează blocul mai mare din care face parte, până la secțiunea întreagă.',
      'Ca să adaugi ceva nou, duplică un bloc asemănător și schimbă-i textul.',
      'Când ai terminat, apasă Exportă și trimite fișierul lui Mario. Site-ul public rămâne neschimbat până îl actualizează el.'
    ].forEach(function (t) { p.body.appendChild(el('p', '', t)); });
    p.actions.appendChild(button('Am înțeles', 'ed-btn ed-primary', function () { keep(HELP_KEY, 1); p.close(); }));
  }

  function offerDraft(draft) {
    var p = panel('Ai modificări de data trecută', true);
    var date = draft.savedAt ? when(new Date(draft.savedAt)) : '';
    p.body.appendChild(el('p', '', 'În acest browser sunt păstrate modificări făcute' + (date ? ' pe ' + date : '') + '. Între timp, site-ul a fost actualizat.'));
    p.body.appendChild(el('p', '', 'Dacă le-ai trimis deja lui Mario, pornește de la pagina actuală. Altfel, continuă cu ele.'));
    p.actions.appendChild(button('Pornește de la pagina actuală', 'ed-btn', function () {
      keep(KEY, null);
      p.close();
      refresh(false);
    }));
    p.actions.appendChild(button('Continuă cu modificările mele', 'ed-btn ed-primary', function () {
      base = draft.base;
      startedAt = draft.startedAt || 0;
      apply(draft.edited);
      p.close();
      refresh(true);
    }));
  }

  function confirmReset(b) {
    if (b.dataset.armed) {
      keep(KEY, null);
      location.reload();
      return;
    }
    b.dataset.armed = '1';
    b.textContent = 'Sigur? Apasă din nou';
    setTimeout(function () { delete b.dataset.armed; b.textContent = 'Renunță la tot'; }, 4000);
  }

  function buildUi() {
    var css = el('style');
    css.textContent =
      'html.editing .callbar{display:none}' +
      'html.editing body{padding-bottom:140px}' +
      'html.editing [contenteditable]:focus,html.editing [contenteditable] :focus-visible{outline:none}' +
      'html.editing [contenteditable] a,html.editing [contenteditable] summary{cursor:text}' +
      '.ed-hover{outline:1px dashed #e8890c!important;outline-offset:4px}' +
      '.ed-active{outline:2px solid #e8890c!important;outline-offset:4px}' +
      'main>section.ed-hover,main>section.ed-active{outline-offset:-4px}' +
      '.ed-new{animation:ed-flash 1.6s ease-out}' +
      '@keyframes ed-flash{from{background-color:rgba(232,137,12,.28)}to{background-color:transparent}}' +
      '.ed-ui,.ed-ui button{font:500 .9rem/1.3 var(--sans,system-ui,sans-serif);letter-spacing:0}' +
      '.ed-ctl{position:fixed;z-index:65;display:none;align-items:center;gap:4px;padding:4px;background:#15333b;color:#fff;border-radius:8px;box-shadow:0 8px 24px rgba(21,51,59,.35);user-select:none;-webkit-user-select:none}' +
      '.ed-ctl .ed-name{padding:0 8px 0 6px;color:#f5c27a;font-size:.8rem;white-space:nowrap;max-width:40vw;overflow:hidden;text-overflow:ellipsis}' +
      '.ed-ctl button{min-height:32px;padding:0 10px;border:0;border-radius:6px;background:rgba(243,248,247,.12);color:#fff;cursor:pointer}' +
      '.ed-ctl button:hover{background:rgba(243,248,247,.24)}' +
      '.ed-ctl .ed-del:hover{background:#a33f3f}' +
      '.ed-bar{position:fixed;z-index:70;left:50%;bottom:16px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;max-width:calc(100% - 24px);padding:8px 8px 8px 16px;background:#15333b;color:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(21,51,59,.4)}' +
      '.ed-bar .ed-title{font-weight:600;white-space:nowrap}' +
      '.ed-bar .ed-status{color:rgba(243,248,247,.75);white-space:nowrap;margin-right:8px}' +
      '.ed-warn{flex-basis:100%;color:#f5c27a;font-size:.8rem}' +
      '.ed-btn{min-height:38px;padding:0 14px;border:1px solid rgba(243,248,247,.3);border-radius:6px;background:transparent;color:#fff;cursor:pointer;white-space:nowrap}' +
      '.ed-btn:hover{background:rgba(243,248,247,.12)}' +
      '.ed-primary{background:#22876a;border-color:#22876a;font-weight:600}' +
      '.ed-primary:hover{background:#1b6d58}' +
      '.ed-toast{position:fixed;z-index:70;left:50%;bottom:84px;transform:translateX(-50%);display:flex;align-items:center;gap:12px;max-width:calc(100% - 24px);padding:10px 14px;background:#fff;color:#15333b;border:1px solid #d4e2dd;border-radius:8px;box-shadow:0 8px 24px rgba(21,51,59,.2)}' +
      '.ed-toast[hidden]{display:none}' +
      '.ed-link{border:0;background:none;padding:4px 2px;color:#1b6d58;font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer}' +
      '.ed-float{position:fixed;z-index:72;right:16px;bottom:84px;width:min(420px,calc(100% - 32px))}' +
      '.ed-modal{position:fixed;z-index:80;inset:0;display:grid;place-items:center;padding:16px;background:rgba(21,51,59,.45)}' +
      '.ed-modal .ed-card{width:min(460px,100%)}' +
      '.ed-card{background:#fff;color:#15333b;border-radius:10px;padding:18px 20px;box-shadow:0 18px 50px rgba(21,51,59,.35)}' +
      '.ed-card h2{font:600 1.1rem/1.3 var(--sans,system-ui,sans-serif);margin:0 0 10px}' +
      '.ed-card p{margin:0 0 10px;font-size:.95rem;color:#4d6a70}' +
      '.ed-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin-top:14px}' +
      '.ed-card .ed-btn{color:#15333b;border-color:#d4e2dd}' +
      '.ed-card .ed-btn:hover{background:#f3f8f7}' +
      '.ed-card .ed-primary{color:#fff;border-color:#22876a}' +
      '.ed-card .ed-primary:hover{background:#1b6d58}' +
      '@media (max-width:879px){' +
      'html.editing body{padding-bottom:170px}' +
      '.ed-bar{left:0;right:0;bottom:0;transform:none;max-width:none;border-radius:0;flex-wrap:wrap;padding:10px max(12px,env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}' +
      '.ed-bar .ed-title{display:none}' +
      '.ed-bar .ed-status{margin-right:auto;font-size:.82rem}' +
      '.ed-bar .ed-btn{padding:0 10px}' +
      '.ed-bar .ed-primary{flex:1 1 100%;order:5;min-height:44px}' +
      '.ed-toast{bottom:124px}' +
      '.ed-float{left:12px;right:12px;bottom:124px;width:auto}' +
      '.ed-ctl button{min-height:40px;padding:0 12px}' +
      '}';
    document.head.appendChild(css);

    var bar = el('div', 'ed-ui ed-bar');
    bar.appendChild(el('span', 'ed-title', 'Mod editare'));
    ui.status = bar.appendChild(el('span', 'ed-status', ''));
    bar.appendChild(button('Ajutor', 'ed-btn', showHelp));
    var reset = button('Renunță la tot', 'ed-btn', function () { confirmReset(reset); });
    reset.title = 'Șterge toate modificările și reîncarcă pagina publică';
    bar.appendChild(reset);
    bar.appendChild(button('Exportă', 'ed-btn ed-primary', exportFile));
    ui.warn = bar.appendChild(el('span', 'ed-warn', 'Browserul nu permite salvarea automată. Exportă înainte să închizi pagina.'));
    ui.warn.hidden = true;
    ui.bar = bar;

    var ctl = el('div', 'ed-ui ed-ctl');
    ui.name = ctl.appendChild(el('span', 'ed-name', ''));
    ui.up = ctl.appendChild(button('↑', 'ed-up', function () { var p = parentOf(active); if (p) setActive(p); }));
    ui.up.title = 'Selectează blocul mai mare';
    ui.up.setAttribute('aria-label', 'Selectează blocul mai mare');
    ctl.appendChild(button('Duplică', 'ed-dup', duplicate));
    ctl.appendChild(button('Șterge', 'ed-del', remove));
    ctl.addEventListener('mousedown', function (e) { e.preventDefault(); });
    ui.ctl = ctl;

    ui.toast = el('div', 'ed-ui ed-toast');
    ui.toast.setAttribute('role', 'status');
    ui.toast.hidden = true;

    document.body.appendChild(ctl);
    document.body.appendChild(ui.toast);
    document.body.appendChild(bar);
  }

  /* ---------- pregătirea paginii și evenimente ---------- */

  function prep() {
    /* butonul video nu poate fi editat; devine div cu aceleași atribute */
    document.querySelectorAll('button[data-yt]').forEach(function (b) {
      var d = el('div');
      [].slice.call(b.attributes).forEach(function (a) { if (a.name !== 'type') d.setAttribute(a.name, a.value); });
      while (b.firstChild) d.appendChild(b.firstChild);
      b.parentNode.replaceChild(d, b);
    });
    document.querySelectorAll('main details').forEach(function (d) { d.open = true; });
    REGIONS.forEach(function (r) {
      var n = document.querySelector(r[1]);
      if (n) regions.push({ name: r[0], el: n, label: r[2] });
    });
  }

  function caretEl() {
    var s = getSelection();
    var n = s && s.anchorNode;
    return n && (n.nodeType === 1 ? n : n.parentElement);
  }

  function wire() {
    regions.forEach(function (r) {
      r.el.setAttribute('contenteditable', 'true');
      r.el.setAttribute('spellcheck', 'false');
      r.el.addEventListener('input', queueSave);
      r.el.addEventListener('drop', function (e) { e.preventDefault(); });
      r.el.addEventListener('dragstart', function (e) { e.preventDefault(); });
      r.el.addEventListener('paste', function (e) {
        var cd = e.clipboardData;
        if (!cd) return;
        e.preventDefault();
        document.execCommand('insertText', false, cd.getData('text/plain').replace(/\r\n?/g, '\n'));
      });
      r.el.addEventListener('keydown', function (e) {
        var n = caretEl();
        if (!n) return;
        if (e.key === 'Escape') { setActive(null); return; }
        if (n.closest('summary') && e.key === ' ') { e.preventDefault(); document.execCommand('insertText', false, ' '); return; }
        if (e.key === 'Enter' && n.closest('h1,h2,h3,dt,summary,cite,figcaption,b,.hero-meta,.nav,#meniu,.brand,.btn')) e.preventDefault();
      });
    });
    /* în meniul de telefon, clicul pe un link nu mai închide meniul */
    var menuList = document.querySelector('#meniu ol');
    if (menuList) menuList.addEventListener('click', function (e) { e.stopPropagation(); });

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('.ed-ui,.ed-card')) return;
      if (!regionOf(t)) { setActive(null); return; }
      if (t.closest('a,summary,[data-yt]')) e.preventDefault();
      if (t.closest('[data-yt]')) e.stopPropagation();
      var b = blockOf(t);
      if (b !== active) setActive(b);
    }, true);

    if (matchMedia('(hover:hover)').matches) {
      document.addEventListener('mouseover', function (e) {
        var b = blockOf(e.target);
        if (b === hovered) return;
        if (hovered) hovered.classList.remove('ed-hover');
        hovered = b;
        if (b && b !== active) b.classList.add('ed-hover');
      });
    }

    var ticking = false;
    function onMove() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; place(); });
    }
    addEventListener('scroll', onMove, { passive: true });
    addEventListener('resize', onMove);
    /* salvează imediat dacă pagina se închide în timpul pauzei de 400 ms */
    addEventListener('pagehide', function () { if (saveTimer) refresh(true); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && saveTimer) refresh(true); });
    addEventListener('beforeunload', function (e) {
      if (!stored && JSON.stringify(snapshot()) !== JSON.stringify(base)) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  ready(function () {
    prep();
    base = snapshot();
    pageHash = hash(base);
    buildUi();
    var draft = load(KEY);
    var offer = false;
    if (draft && draft.edited && draft.base) {
      if (draft.pageHash === pageHash) {
        base = draft.base;
        startedAt = draft.startedAt || 0;
        apply(draft.edited);
      } else if (draft.exportedAt && draft.exportedAt >= draft.savedAt) {
        keep(KEY, null);
      } else {
        offer = true;
      }
    }
    wire();
    refresh(false);
    if (offer) offerDraft(draft);
    else if (!load(HELP_KEY)) showHelp();
  });
})();
