(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.MXUserDictionary = api;
    // Recover interrupted dictionary edits before the application loads any book state.
    try { api.recover(root.localStorage); } catch (error) { api.recoveryError = error; }
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var JOURNAL = 'mxdict_transaction_v1';
  function own(o, key) { return Object.prototype.hasOwnProperty.call(o, key); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function key(word) { return String(word || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(); }
  function split(text) {
    var out = [], current = '', depth = 0;
    String(text || '').split('').forEach(function (c) {
      if (c === '(' || c === '（') depth++;
      else if (c === ')' || c === '）') depth = Math.max(0, depth - 1);
      if (c === '、' && depth === 0) { if (current.trim()) out.push(current.trim()); current = ''; }
      else current += c;
    });
    if (current.trim()) out.push(current.trim());
    return out;
  }
  function senseRow(row) {
    if (row && typeof row === 'object') return { m: String(row.m || '').trim(), p: String(row.p || '').trim() };
    var text = String(row || '').trim(), match = /^（(名詞|動詞|他動詞|自動詞|形容詞|副詞|前置詞|接続詞|代名詞|助動詞|間投詞|冠詞|熟語|固有名詞)）([\s\S]+)$/.exec(text);
    return { m: (match ? match[2] : text).trim(), p: match ? match[1] : '' };
  }
  function senses(word) {
    var raw = Array.isArray(word && word.senses) && word.senses.length ? word.senses :
      Array.isArray(word && word.ms) && word.ms.length ? word.ms : split(word && word.m);
    return raw.map(senseRow).filter(function (row) { return row.m; });
  }
  function normalize(word) {
    var out = clone(word), stored = Array.isArray(out.senses) ? out.senses.map(senseRow).filter(function (row) { return row.m; }) : [];
    var old = Array.isArray(out.ms) ? out.ms.map(senseRow).filter(function (row) { return row.m; }) : [];
    var fromText = split(out.m).map(senseRow).filter(function (row) { return row.m; }), plain = function (rows) { return rows.map(function (row) { return row.m; }).join('、'); };
    // A user may return to an older app version that knows only m/ms. Prefer whichever
    // legacy field actually changed, then carry forward matching per-sense POS labels.
    var source = stored;
    if (stored.length && fromText.length && plain(fromText) !== plain(stored)) source = fromText;
    else if (stored.length && old.length && plain(old) !== plain(stored)) source = old;
    else if (!stored.length) source = old.length && plain(old) === String(out.m || '') ? old : fromText;
    out.senses = source.map(function (row, index) {
      var fixed = senseRow(row); if (fixed.p || !stored.length) return fixed;
      var same = stored.find(function (saved) { return saved.m === fixed.m; });
      fixed.p = same ? same.p : (stored[index] && stored[index].p || ''); return fixed;
    }).filter(function (row) { return row.m; });
    out.ms = out.senses.map(function (row) { return row.m; });
    out.m = out.ms.join('、');
    out.user = 1;
    if (['new', 'weak', 'review', 'learned'].indexOf(out.st) < 0) out.st = 'new';
    return out;
  }
  function normalizeWords(words) {
    if (!Array.isArray(words)) throw new Error('追加単語の保存データを読み込めませんでした');
    return words.map(function (word) {
      if (!word || typeof word.w !== 'string' || typeof word.m !== 'string') throw new Error('追加単語の保存データを読み込めませんでした');
      return normalize(word);
    });
  }
  function create(word, rows, day) {
    var normalized = rows.map(senseRow).filter(function (row) { return row.m; });
    var meanings = normalized.map(function (row) { return row.m; });
    return { w: key(word), m: meanings.join('、'), ms: meanings, senses: normalized, st: 'new', user: 1, ad: day };
  }
  function sortWords(words) {
    return (words || []).map(function (word, index) { return { word: word, index: index }; }).sort(function (a, b) {
      return key(a.word.w).localeCompare(key(b.word.w), 'en', { sensitivity: 'base', numeric: true }) || a.index - b.index;
    });
  }
  function duplicate(word, books, words, except) {
    var target = key(word), all = (words || []).slice();
    (books || []).forEach(function (book) { all = all.concat(book.deck || []); });
    return all.find(function (item) { return item !== except && key(item.w) === target; }) || null;
  }
  function meaningMap(before, after) {
    var used = {}, mapping = before.map(function (m) {
      var at = after.findIndex(function (n, i) { return n === m && !used[i]; });
      if (at >= 0) used[at] = true;
      return at;
    });
    // Same-size text corrections retain their original position; reordered senses follow their text.
    if (before.length === after.length) mapping.forEach(function (at, i) {
      if (at < 0 && !used[i]) { mapping[i] = i; used[i] = true; }
    });
    return mapping;
  }
  function move(map, oldKey, newKey) {
    if (!map || !own(map, oldKey) || oldKey === newKey) return;
    if (newKey != null) Object.defineProperty(map, newKey, { value: map[oldKey], writable: true, configurable: true, enumerable: true });
    delete map[oldKey];
  }
  function rewriteBook(book, before, after) {
    var out = clone(book), oldKey = before.w, newKey = after ? after.w : null;
    ['fc', 'whist', 'munk', 'wst'].forEach(function (field) { out[field] = out[field] || {}; move(out[field], oldKey, newKey); });
    if (after && own(out.munk, newKey)) {
      var mapping = meaningMap(normalize(before).ms, after.ms), seen = {};
      out.munk[newKey] = out.munk[newKey].map(function (i) { return mapping[i]; }).filter(function (i) {
        if (!Number.isInteger(i) || i < 0 || seen[i]) return false;
        seen[i] = true; return true;
      });
      if (!out.munk[newKey].length) delete out.munk[newKey];
    }
    out.miss = (out.miss || []).filter(function (entry) { return after || (typeof entry === 'string' ? entry : entry.w) !== oldKey; }).map(function (entry) {
      if (typeof entry === 'string') return entry === oldKey ? newKey : entry;
      if (entry.w === oldKey) entry.w = newKey;
      return entry;
    });
    out.rev = (out.rev || []).filter(function (w) { return after || w !== oldKey; }).map(function (w) { return w === oldKey ? newKey : w; });
    Object.keys(out.skim || {}).forEach(function (section) { move(out.skim[section].done, oldKey, newKey); });
    return out;
  }
  function scoped(map, oldWord, newWord) {
    Object.keys(map || {}).forEach(function (id) {
      // Prefixes are book|word or book|kind|word. Word text itself may contain |.
      var prefix = id.indexOf('|') + 1, rest = id.slice(prefix);
      if (rest !== oldWord.toLowerCase() && /^(word|deriv|alt|idiom|chain)\|/.test(rest)) prefix += rest.indexOf('|') + 1;
      if (id.slice(prefix) === oldWord.toLowerCase()) move(map, id, newWord == null ? null : id.slice(0, prefix) + newWord.toLowerCase());
    });
  }
  function rewriteDay(day, before, after) {
    var out = clone(day);
    scoped(out.log, before.w, after && after.w); scoped(out.streak, before.w, after && after.w);
    // Deleting an entry must not erase answers that really happened today.
    if (after) scoped(out.words, before.w, after.w);
    return out;
  }
  function rewriteDaily(daily, before, after) {
    var out = clone(daily);
    if (!after || before.w === after.w) return out; // Historical answer/meaning snapshots remain intact on deletion or meaning edits.
    Object.keys(out).forEach(function (day) {
      var entry = out[day]; scoped(entry.wordCounts, before.w, after.w);
      Object.keys(entry.transitions || {}).forEach(function (kind) { scoped(entry.transitions[kind], before.w, after.w); });
      scoped(entry.wrongWords, before.w, after.w);
      Object.keys(entry.wrongWords || {}).forEach(function (id) { var row = entry.wrongWords[id]; if (row.w === before.w) row.w = after.w; });
    });
    return out;
  }
  function recover(storage) {
    var raw = storage.getItem(JOURNAL);
    if (raw == null) return;
    var journal = JSON.parse(raw);
    if (!journal || journal.version !== 1 || !Array.isArray(journal.before)) throw new Error('追加単語の保存を復旧できませんでした');
    journal.before.forEach(function (entry) {
      if (storage.getItem(entry[0]) === entry[1]) return;
      if (entry[1] == null) storage.removeItem(entry[0]); else storage.setItem(entry[0], entry[1]);
    });
    storage.removeItem(JOURNAL);
  }
  function write(storage, changes) {
    recover(storage);
    var keys = Object.keys(changes).filter(function (k) { return storage.getItem(k) !== changes[k]; });
    if (!keys.length) return;
    var before = keys.map(function (k) { return [k, storage.getItem(k)]; });
    // Write-ahead rollback journal: interruption/partial writes never silently split words from histories.
    storage.setItem(JOURNAL, JSON.stringify({ version: 1, before: before }));
    try {
      keys.forEach(function (k) { if (changes[k] == null) storage.removeItem(k); else storage.setItem(k, changes[k]); });
      storage.removeItem(JOURNAL);
    } catch (error) {
      try { recover(storage); } catch (_) { /* Leave the journal for the next launch; do not overwrite it. */ }
      throw error;
    }
  }
  return { key: key, split: split, senses: senses, normalize: normalize, normalizeWords: normalizeWords, create: create, sortWords: sortWords, duplicate: duplicate,
    meaningMap: meaningMap, move: move, rewriteBook: rewriteBook, rewriteDay: rewriteDay, rewriteDaily: rewriteDaily,
    write: write, recover: recover, journalKey: JOURNAL };
});
