/* Comutator intre variantele de design. Se scoate cand alegem varianta finala. */
(function () {
  var VARIANTS = [
    { n: 1, name: 'Editorial', path: '' },
    { n: 2, name: 'Briză', path: 'varianta-2/' },
    { n: 3, name: 'Senin', path: 'varianta-3/' }
  ];
  var base = document.currentScript.src.replace(/switcher\.js.*$/, '');
  var cur = +document.documentElement.getAttribute('data-variant') || 1;

  var css = document.createElement('style');
  css.textContent =
    ':root{--sw-h:44px}' +
    'body{padding-top:var(--sw-h)!important}' +
    '[data-sec]{scroll-margin-top:calc(var(--sw-h) + 72px)}' +
    '.sw-bar{position:fixed;top:0;left:0;right:0;height:var(--sw-h);z-index:1000;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:0 8px 0 14px;background:#151515;color:#ddd;font:500 13px/1 system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '.sw-title{margin-right:auto;color:#999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.sw-seg{display:flex;background:#2b2b2b;border-radius:8px;padding:3px}' +
    '.sw-seg a{color:#bbb;text-decoration:none;padding:7px 10px;border-radius:6px;white-space:nowrap}' +
    '.sw-seg a:hover{color:#fff}' +
    '.sw-seg b{margin-right:5px}' +
    '.sw-seg a[aria-current]{background:#fff;color:#151515}' +
    '.sw-lbl{background:none;border:1px solid #444;color:#bbb;border-radius:8px;padding:7px 10px;font:inherit;cursor:pointer;white-space:nowrap}' +
    '.sw-lbl[aria-pressed="true"]{background:#e2513b;border-color:#e2513b;color:#fff}' +
    '.sw-badge{display:none}' +
    '.sw-on [data-sec]{position:relative;outline:2px dashed rgba(226,81,59,.8);outline-offset:-3px}' +
    '.sw-on .sw-badge{display:block;position:absolute;top:10px;left:10px;z-index:999;background:#e2513b;color:#fff;font:700 12px/1 system-ui,sans-serif;padding:6px 8px;border-radius:4px;pointer-events:none}' +
    '@media (max-width:640px){.sw-title{display:none}}' +
    '@media (max-width:440px){.sw-seg a:not([aria-current]) .sw-name{display:none}.sw-seg a{padding:7px 9px}}';
  document.head.appendChild(css);

  function sectionInView() {
    var id = '';
    var line = window.innerHeight * 0.35;
    document.querySelectorAll('[data-sec][id]').forEach(function (el) {
      if (el.getBoundingClientRect().top <= line) id = el.id;
    });
    return id === 'sus' ? '' : id;
  }

  function build() {
    var bar = document.createElement('div');
    bar.className = 'sw-bar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Variante de design');

    var title = document.createElement('span');
    title.className = 'sw-title';
    title.textContent = 'Propuneri de design, Daniela Rusev';
    bar.appendChild(title);

    var seg = document.createElement('div');
    seg.className = 'sw-seg';
    VARIANTS.forEach(function (v) {
      var a = document.createElement('a');
      a.href = base + v.path;
      a.innerHTML = '<b>' + v.n + '</b><span class="sw-name">' + v.name + '</span>';
      if (v.n === cur) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', function () {
        var id = sectionInView();
        a.href = base + v.path + (id ? '#' + id : '');
      });
      seg.appendChild(a);
    });
    bar.appendChild(seg);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sw-lbl';
    btn.textContent = 'Etichete';
    btn.title = 'Arată numele și numărul fiecărei secțiuni';
    bar.appendChild(btn);

    document.querySelectorAll('[data-sec]').forEach(function (el, i) {
      var b = document.createElement('span');
      b.className = 'sw-badge';
      b.textContent = cur + '.' + (i + 1) + ' ' + el.getAttribute('data-sec');
      el.insertBefore(b, el.firstChild);
    });

    function setLabels(on) {
      document.body.classList.toggle('sw-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      try { localStorage.setItem('sw-labels', on ? '1' : '0'); } catch (e) {}
    }
    var saved = false;
    try { saved = localStorage.getItem('sw-labels') === '1'; } catch (e) {}
    setLabels(saved);
    btn.addEventListener('click', function () {
      setLabels(!document.body.classList.contains('sw-on'));
    });

    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
