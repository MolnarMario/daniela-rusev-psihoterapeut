/* Telefon: titlul rămâne vizibil, paragraful se deschide la atingere.
   Sub 900px, fiecare pereche titlu + text din data-groups devine un dropdown.
   Pe desktop nu se atinge nimic. Configurare: data-groups='[{"item":"...","head":"...","body":"..."}]' */
(function () {
  var cfg;
  try { cfg = JSON.parse(document.currentScript.getAttribute('data-groups')); } catch (e) { return; }
  if (!cfg || !window.matchMedia) return;
  /* în modul de editare (editor.js) tot textul rămâne deschis și editabil */
  if (document.documentElement.classList.contains('editing')) return;

  var mq = matchMedia('(max-width:899px)');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var items = [];
  var uid = 0;

  var css = document.createElement('style');
  css.textContent =
    '.acc-btn{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;margin:0;padding:0;border:0;background:none;color:inherit;font:inherit;letter-spacing:inherit;text-align:left;text-decoration:inherit;text-transform:inherit;cursor:pointer;-webkit-appearance:none;appearance:none}' +
    '.acc-btn::after{content:"";flex:none;width:9px;height:9px;margin:-3px 4px 0 0;border-right:2px solid var(--acc-c,currentColor);border-bottom:2px solid var(--acc-c,currentColor);transform:rotate(45deg);transition:transform .25s ease}' +
    '.acc-btn[aria-expanded="true"]::after{transform:translateY(3px) rotate(-135deg)}' +
    '.acc-head:not(.acc-open){margin-bottom:0!important}' +
    '.acc-body{overflow:hidden;transition:height .28s ease,visibility 0s linear .28s}' +
    '.acc-body:not(.acc-show){height:0;visibility:hidden;margin-top:0!important;margin-bottom:0!important}' +
    '.acc-body.acc-show{visibility:visible;transition:height .28s ease,visibility 0s}' +
    '@media (prefers-reduced-motion:reduce){.acc-body,.acc-body.acc-show,.acc-btn::after{transition:none}}';
  document.head.appendChild(css);

  function open(it, instant) {
    var b = it.body;
    it.btn.setAttribute('aria-expanded', 'true');
    it.head.classList.add('acc-open');
    b.classList.add('acc-show');
    if (instant || reduce.matches) { b.style.height = 'auto'; return; }
    b.style.height = b.scrollHeight + 'px';
    b.addEventListener('transitionend', function done(e) {
      if (e.target !== b || e.propertyName !== 'height') return;
      b.removeEventListener('transitionend', done);
      if (b.classList.contains('acc-show')) b.style.height = 'auto';
    });
  }

  function close(it) {
    var b = it.body;
    it.btn.setAttribute('aria-expanded', 'false');
    it.head.classList.remove('acc-open');
    b.style.height = b.scrollHeight + 'px';
    void b.offsetHeight;
    b.classList.remove('acc-show');
    b.style.height = '0px';
  }

  function enable() {
    cfg.forEach(function (g) {
      document.querySelectorAll(g.item).forEach(function (item) {
        var head = item.querySelector(g.head);
        var body = item.querySelector(g.body);
        if (!head || !body || head.contains(body) || item.__acc) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'acc-btn';
        while (head.firstChild) btn.appendChild(head.firstChild);
        head.appendChild(btn);
        head.classList.add('acc-head');
        body.classList.add('acc-body');
        body.id = body.id || 'acc-' + (++uid);
        btn.setAttribute('aria-controls', body.id);
        btn.setAttribute('aria-expanded', 'false');
        body.style.height = '0px';
        var it = { item: item, head: head, body: body, btn: btn };
        btn.addEventListener('click', function () {
          if (btn.getAttribute('aria-expanded') === 'true') close(it); else open(it);
        });
        item.__acc = it;
        items.push(it);
      });
    });
  }

  function disable() {
    items.forEach(function (it) {
      while (it.btn.firstChild) it.head.insertBefore(it.btn.firstChild, it.btn);
      it.btn.remove();
      it.head.classList.remove('acc-head', 'acc-open');
      it.body.classList.remove('acc-body', 'acc-show');
      it.body.style.height = '';
      if (/^acc-\d+$/.test(it.body.id)) it.body.removeAttribute('id');
      delete it.item.__acc;
    });
    items = [];
  }

  function sync() { if (mq.matches) enable(); else disable(); }
  sync();
  if (mq.addEventListener) mq.addEventListener('change', sync); else mq.addListener(sync);
})();
