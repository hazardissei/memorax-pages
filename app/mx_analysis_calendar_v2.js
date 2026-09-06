(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MemoraAnalysis = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var METRICS = {
    answers: { label: '総単語数', summary: '今まで解いた総単語数', note: '全単語帳・繰り返しを含む延べ回答数', day: '解いた単語', color: 'pink' },
    learned: { label: '覚えた単語', summary: '覚えた単語', note: '全単語帳・現在「覚えた」の単語数', day: '新しく覚えた単語', color: 'green' },
    weak: { label: '苦手な単語', summary: '苦手な単語', note: '全単語帳・現在の苦手リストの単語数', day: '苦手に入った単語', color: 'orange' }
  };
  function count(value) { var n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }
  function unique(map) { return Object.keys(map || {}).filter(function (key) { return count(map[key]) > 0; }).length; }
  function key(date) { return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(); }
  function parseDay(value) {
    var match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(value || ''));
    if (!match) return null;
    var d = new Date(+match[1], +match[2] - 1, +match[3]);
    return d.getFullYear() === +match[1] && d.getMonth() === +match[2] - 1 && d.getDate() === +match[3] ? d : null;
  }
  function month(date, delta) { return new Date(date.getFullYear(), date.getMonth() + (delta || 0), 1); }
  function monthKey(date) { return date.getFullYear() + '-' + (date.getMonth() + 1); }
  function format(n) { return count(n).toLocaleString('ja-JP'); }
  function dailyValue(entry, metric) {
    if (!entry) return null;
    if (metric === 'answers') return entry.answers == null ? null : count(entry.answers);
    if (entry.transitionComplete !== true || !entry.transitions) return null;
    var map = entry.transitions[metric];
    return map && typeof map === 'object' && !Array.isArray(map) ? unique(map) : null;
  }
  // The day's mistakes are snapshots, not the mutable current weak list.
  function wrongDay(entry) {
    var map = entry && entry.wrongWords;
    var validMap = map && typeof map === 'object' && !Array.isArray(map);
    var rows = validMap ? Object.keys(map).reduce(function (out, id) {
      var row = map[id];
      if (row && typeof row === 'object' && typeof row.w === 'string' && row.w.trim() && count(row.count)) {
        out.push({ id: id, w: row.w, m: typeof row.m === 'string' ? row.m : '', book: typeof row.book === 'string' ? row.book : '', kind: row.kind || 'word', count: count(row.count) });
      }
      return out;
    }, []) : [];
    rows.sort(function (a, b) { return a.w.localeCompare(b.w, 'en') || a.id.localeCompare(b.id); });
    var complete = !!(entry && ((entry.wrongComplete === true && validMap) || (entry.answers === 0 && !rows.length)));
    return { rows: rows, complete: complete, attempts: rows.reduce(function (n, row) { return n + row.count; }, 0) };
  }
  // Do not sum per-book counters: the same spelling can occur in several books/faculties.
  function totals(books, currentBook, currentMiss, solved) {
    var words = new Map(), misses = new Set();
    (books || []).forEach(function (book, i) {
      (book.deck || []).forEach(function (word) {
        var w = String(word.w || '').trim().toLowerCase();
        if (!w) return;
        var item = words.get(w) || { learned: false, touched: false };
        item.learned = item.learned || word.st === 'learned';
        item.touched = item.touched || (word.st && word.st !== 'new');
        words.set(w, item);
      });
      (i === currentBook ? currentMiss || [] : book.miss || []).forEach(function (entry) {
        var w = String(typeof entry === 'string' ? entry : entry.w || '').trim().toLowerCase();
        if (w) misses.add(w);
      });
    });
    var learned = 0, unlearned = 0;
    words.forEach(function (value, w) { if (value.learned) learned++; if (!value.touched && !misses.has(w)) unlearned++; });
    return { answers: count(solved), learned: learned, weak: misses.size, unlearned: unlearned };
  }
  function monthDays(date, now, daily, metric) {
    var y = date.getFullYear(), m = date.getMonth(), last = new Date(y, m + 1, 0).getDate();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), peak = 0, rows = [];
    for (var d = 1; d <= last; d++) {
      var at = new Date(y, m, d), future = at > today, entry = daily[key(at)], value = future ? null : dailyValue(entry, metric);
      if (value !== null) peak = Math.max(peak, value);
      rows.push({ key: key(at), day: d, future: future, today: +at === +today, value: value, goal: count(entry && entry.goal) });
    }
    rows.forEach(function (row) {
      var base = metric === 'answers' ? row.goal : peak;
      row.ratio = row.value === null || !base ? 0 : Math.min(1, row.value / base);
    });
    return { offset: (new Date(y, m, 1).getDay() + 6) % 7, days: rows };
  }
  function earliestMonth(daily, now) {
    var first = month(now, -11);
    Object.keys(daily || {}).forEach(function (k) { var d = parseDay(k); if (d && d < first) first = month(d); });
    return first;
  }
  function element(doc, tag, cls, text) {
    var el = doc.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el;
  }
  function mount(host, input) {
    if (host._memoraCalendar) { host._memoraCalendar.update(input); return host._memoraCalendar; }
    var doc = host.ownerDocument, data = input, metric = 'answers', selected = key(input.now), months = [], loading = false;
    host.classList.add('ac-root');
    host.innerHTML = '<header class="ac-header"><div class="ac-title-row"><h1>学習カレンダー</h1><button type="button" class="ac-today">今日</button></div>' +
      '<div class="ac-summary" aria-live="polite"><div class="ac-primary"><div class="ac-summary-label"></div><div class="ac-number"><b></b><span>語</span></div></div>' +
      '<div class="ac-unlearned"><span>未学習</span><div><b></b><small>語</small></div></div></div>' +
      '<div class="ac-tabs" role="tablist" aria-label="カレンダーの表示"></div><div class="ac-note"></div>' +
      '<div class="ac-selection" aria-live="polite"></div><div class="ac-weekdays" aria-hidden="true"><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span></div></header>' +
      '<div class="ac-scroll" tabindex="0" role="region" aria-label="月別の学習記録。上下にスクロールできます"><button type="button" class="ac-older">さらに前の月</button><div class="ac-months"></div></div>';
    var $ = function (s) { return host.querySelector(s); }, scroller = $('.ac-scroll'), list = $('.ac-months'), older = $('.ac-older');
    var dialog = element(doc, 'dialog', 'ac-wrong-dialog');
    dialog.setAttribute('aria-labelledby', 'ac-wrong-title'); dialog.setAttribute('aria-describedby', 'ac-wrong-note');
    dialog.innerHTML = '<div class="ac-wrong-head"><div><p class="ac-wrong-date"></p><h2 id="ac-wrong-title">間違えた単語</h2></div><button type="button" class="ac-wrong-close" aria-label="単語一覧を閉じる">×</button></div><div class="ac-wrong-body" tabindex="0"><p id="ac-wrong-note"></p><ul class="ac-wrong-list"></ul></div>';
    host.appendChild(dialog);
    var backFocus = null, backScroll = 0, closeButton = dialog.querySelector('.ac-wrong-close'), fallbackHidden = [];
    var fallbackBackdrop = element(doc, 'div', 'ac-wrong-backdrop'); fallbackBackdrop.hidden = true; host.appendChild(fallbackBackdrop);
    function restoreWrongFocus() {
      fallbackBackdrop.hidden = true;
      fallbackHidden.forEach(function (entry) { if (entry.value === null) entry.node.removeAttribute('aria-hidden'); else entry.node.setAttribute('aria-hidden', entry.value); });
      fallbackHidden = []; scroller.scrollTop = backScroll;
      if (backFocus && backFocus.isConnected) backFocus.focus({ preventScroll: true });
    }
    function closeWrong() {
      if (typeof dialog.close === 'function' && !dialog.classList.contains('is-fallback')) dialog.close();
      else { dialog.removeAttribute('open'); restoreWrongFocus(); }
    }
    fallbackBackdrop.addEventListener('click', closeWrong);
    function fallbackKeys(event) {
      if (!dialog.hasAttribute('open') || !dialog.classList.contains('is-fallback')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeWrong(); }
      else if (event.key === 'Tab') {
        event.preventDefault();
        (doc.activeElement === closeButton ? dialog.querySelector('.ac-wrong-body') : closeButton).focus({ preventScroll: true });
      }
    }
    function fallbackFocus(event) {
      if (dialog.hasAttribute('open') && dialog.classList.contains('is-fallback') && !dialog.contains(event.target)) closeButton.focus({ preventScroll: true });
    }
    doc.addEventListener('keydown', fallbackKeys); doc.addEventListener('focusin', fallbackFocus);
    closeButton.addEventListener('click', closeWrong);
    dialog.addEventListener('click', function (event) {
      var box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) closeWrong();
    });
    dialog.addEventListener('close', restoreWrongFocus);
    function openWrong(button) {
      var day = parseDay(selected), model = wrongDay(data.daily[selected]), items = dialog.querySelector('.ac-wrong-list');
      dialog.querySelector('.ac-wrong-date').textContent = day.getFullYear() + '年' + (day.getMonth() + 1) + '月' + day.getDate() + '日';
      dialog.querySelector('#ac-wrong-note').textContent = model.rows.length ?
        format(model.rows.length) + '語・誤答 ' + format(model.attempts) + '回' + (model.complete ? '。あとで正解した単語も含みます。' : '（記録開始後の分のみ）。更新前の誤答は記録されていません。') :
        model.complete ? 'この日に間違えた単語はありません。' : '記録なし。この日の単語別の誤答履歴は保存されていません。';
      items.replaceChildren();
      model.rows.forEach(function (row) {
        var li = element(doc, 'li', 'ac-wrong-item'), heading = element(doc, 'div', 'ac-wrong-word');
        heading.appendChild(element(doc, 'b', '', row.w)); heading.appendChild(element(doc, 'span', 'ac-wrong-count', format(row.count) + '回'));
        li.appendChild(heading); li.appendChild(element(doc, 'p', 'ac-wrong-meaning', row.m || '意味の記録なし'));
        var kind = { deriv: '派生語', alt: '別の意味', idiom: '熟語', chain: '関連語' }[row.kind];
        li.appendChild(element(doc, 'small', 'ac-wrong-book', [row.book, kind].filter(Boolean).join(' · '))); items.appendChild(li);
      });
      backFocus = button; backScroll = scroller.scrollTop;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else {
        dialog.classList.add('is-fallback'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('open', '');
        fallbackBackdrop.hidden = false;
        [$('.ac-header'), scroller, host.parentElement.querySelector('.mh-nav')].filter(Boolean).forEach(function (node) { fallbackHidden.push({ node: node, value: node.getAttribute('aria-hidden') }); node.setAttribute('aria-hidden', 'true'); });
      }
      dialog.querySelector('.ac-wrong-body').scrollTop = 0; closeButton.focus({ preventScroll: true });
    }
    var tablist = $('.ac-tabs'), tabs = {};
    Object.keys(METRICS).forEach(function (name) {
      var b = element(doc, 'button', 'ac-tab', METRICS[name].label);
      b.type = 'button'; b.id = 'ac-tab-' + name; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'ac-month-panel');
      b.addEventListener('click', function () { setMetric(name); });
      b.addEventListener('keydown', function (event) {
        var names = Object.keys(METRICS), i = names.indexOf(metric), next;
        if (event.key === 'ArrowRight') next = names[(i + 1) % names.length];
        else if (event.key === 'ArrowLeft') next = names[(i + names.length - 1) % names.length];
        else if (event.key === 'Home') next = names[0];
        else if (event.key === 'End') next = names[names.length - 1];
        if (next) { event.preventDefault(); setMetric(next); tabs[next].focus(); }
      });
      tabs[name] = b; tablist.appendChild(b);
    });
    list.id = 'ac-month-panel'; list.setAttribute('role', 'tabpanel');
    function paintSummary() {
      var meta = METRICS[metric]; host.setAttribute('data-metric', meta.color);
      $('.ac-summary-label').textContent = meta.summary;
      $('.ac-number b').textContent = format(data.totals[metric]);
      $('.ac-unlearned b').textContent = format(data.totals.unlearned);
      $('.ac-note').textContent = meta.note;
      Object.keys(tabs).forEach(function (name) { var on = name === metric; tabs[name].setAttribute('aria-selected', String(on)); tabs[name].tabIndex = on ? 0 : -1; });
      list.setAttribute('aria-labelledby', tabs[metric].id);
      paintSelection();
    }
    function paintSelection() {
      var day = parseDay(selected), entry = data.daily[selected], value = dailyValue(entry, metric);
      $('.ac-selection').textContent = (day ? (day.getMonth() + 1) + '月' + day.getDate() + '日' : '選択日') + '　' +
        (value === null ? '記録なし' : METRICS[metric].day + ' ' + format(value) + '語' + (metric === 'answers' && !count(entry && entry.goal) ? '（目標の記録なし）' : ''));
    }
    function monthElement(date) {
      var section = element(doc, 'section', 'ac-month'), title = element(doc, 'h2', '', date.getFullYear() + '年 ' + (date.getMonth() + 1) + '月');
      section.dataset.month = monthKey(date); section.appendChild(title);
      var grid = element(doc, 'div', 'ac-grid'), model = monthDays(date, data.now, data.daily, metric);
      for (var n = 0; n < model.offset; n++) { var space = element(doc, 'div', 'ac-space'); space.setAttribute('aria-hidden', 'true'); grid.appendChild(space); }
      model.days.forEach(function (day) {
        var b = element(doc, 'button', 'ac-day' + (day.future ? ' is-future' : day.value === null ? ' is-missing' : day.value === 0 ? ' is-zero' : '') + (day.today ? ' is-today' : ''));
        b.type = 'button'; b.dataset.day = day.key; b.disabled = day.future;
        if (!day.future) { b.setAttribute('aria-haspopup', 'dialog'); b.title = 'この日に間違えた単語を見る'; }
        b.setAttribute('aria-pressed', String(day.key === selected));
        if (day.today) b.setAttribute('aria-current', 'date');
        b.setAttribute('aria-label', date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + day.day + '日 ' + (day.future ? '未来' : day.value === null ? '記録なし' : METRICS[metric].day + ' ' + format(day.value) + '語'));
        b.appendChild(element(doc, 'span', 'ac-day-number', day.day));
        var visual = element(doc, 'span', 'ac-ring'); visual.setAttribute('aria-hidden', 'true');
        var length = 2 * Math.PI * 18, stroke = (length * day.ratio).toFixed(3);
        visual.innerHTML = '<svg viewBox="0 0 46 46" focusable="false"><circle class="ac-track" cx="23" cy="23" r="18"/>' +
          (day.value !== null && !day.future && day.value > 0 ? '<circle class="ac-progress" cx="23" cy="23" r="18" stroke-dasharray="' + stroke + ' ' + length.toFixed(3) + '" transform="rotate(-90 23 23)"/>' : '') + '</svg>';
        var center = element(doc, 'span', 'ac-ring-value', day.future ? '' : day.value === null ? '—' : format(day.value));
        center.dataset.digits = String(center.textContent.length); visual.appendChild(center);
        b.appendChild(visual); grid.appendChild(b);
      });
      section.appendChild(grid);
      var explanation = metric === 'answers' ? 'リング：当日の目標比（目標未保存は実数のみ）' : 'リング：この月の最多日に対する割合';
      section.appendChild(element(doc, 'p', 'ac-legend', explanation + ' · 点線は記録なし'));
      return section;
    }
    function paintMonths() {
      var fragment = doc.createDocumentFragment(); months.forEach(function (d) { fragment.appendChild(monthElement(d)); });
      list.replaceChildren(fragment); older.hidden = months[0] <= earliestMonth(data.daily, data.now);
    }
    function setMetric(name) {
      if (!METRICS[name]) return;
      var y = scroller.scrollTop; metric = name; paintSummary(); paintMonths(); scroller.scrollTop = y;
    }
    function scrollCurrent() {
      var section = list.querySelector('[data-month="' + monthKey(data.now) + '"]');
      if (section) scroller.scrollTop += section.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    }
    function loadOlder() {
      if (loading || older.hidden) return;
      loading = true;
      var previous = scroller.scrollHeight, y = scroller.scrollTop, first = earliestMonth(data.daily, data.now), added = [];
      for (var n = 1; n <= 3; n++) { var d = month(months[0], -n); if (d >= first) added.unshift(d); }
      if (!added.length) { older.hidden = true; loading = false; return; }
      months = added.concat(months);
      var fragment = doc.createDocumentFragment(); added.forEach(function (d) { fragment.appendChild(monthElement(d)); });
      list.prepend(fragment); older.hidden = months[0] <= first;
      scroller.scrollTop = y + scroller.scrollHeight - previous; loading = false;
    }
    scroller.addEventListener('scroll', function () { if (scroller.scrollTop < 100) loadOlder(); }, { passive: true });
    older.addEventListener('click', function () { loadOlder(); var first = list.querySelector('.ac-day:not(:disabled)'); if (first) first.focus(); });
    list.addEventListener('click', function (event) {
      var b = event.target.closest('button[data-day]'); if (!b || b.disabled) return;
      selected = b.dataset.day;
      list.querySelectorAll('[data-day]').forEach(function (el) { el.setAttribute('aria-pressed', String(el.dataset.day === selected)); }); paintSelection(); openWrong(b);
    });
    $('.ac-today').addEventListener('click', function () { selected = key(data.now); paintSelection(); paintMonths(); scrollCurrent(); });
    function update(next) {
      var changedMonth = monthKey(data.now) !== monthKey(next.now); data = next;
      if (!months.length || changedMonth) { months = [month(next.now, -2), month(next.now, -1), month(next.now)]; selected = key(next.now); }
      paintSummary(); paintMonths(); scrollCurrent();
    }
    var controller = { update: update, destroy: function () { if (dialog.hasAttribute('open')) closeWrong(); doc.removeEventListener('keydown', fallbackKeys); doc.removeEventListener('focusin', fallbackFocus); host._memoraCalendar = null; host.replaceChildren(); } };
    host._memoraCalendar = controller; update(input); return controller;
  }
  return { metrics: METRICS, key: key, parseDay: parseDay, month: month, dailyValue: dailyValue, wrongDay: wrongDay, totals: totals, monthDays: monthDays, earliestMonth: earliestMonth, mount: mount };
});
