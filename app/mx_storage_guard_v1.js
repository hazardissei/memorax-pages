/* アプリ内の保存領域（localStorage）の見張り（2026-09-23 ユーザー報告「スマホに50GB空いているのに進捗を保存できない」）。
   iOS の WebView の localStorage は、端末の空き容量と関係なく1アプリ約5MB。日本語を含む値は1字2バイトで数える（WebKit と同じ数え方）。
   枠が詰まったら「消してよい予備」から順に消して空きを作る：データ読み込み前の退避(mx2imp_)→週1の予備(mx2bk2_)→毎日の予備(mx2bk_)。
   学習データ本体は消さない。起動時（ほかのスクリプトより先）と、書き込みが容量不足で失敗した瞬間（setItem の中）に働く。 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root) return;
  root.MXStorageGuard = api;
  var storage = null;
  try { storage = root.localStorage; } catch (error) { storage = null; }
  if (!storage) return;
  try { if (api.usage(storage) > api.SOFT) api.relieve(storage, api.TARGET); } catch (error) { /* 見張りの失敗で起動を止めない */ }
  try { api.install(root.Storage && root.Storage.prototype); } catch (error) { /* 同上 */ }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var SOFT = 3500000, TARGET = 2500000;
  var ORDER = ['mx2imp_', 'mx2bk2_', 'mx2bk_'];
  var MARKER = { mx2bk2_: 'mx2_bakd2', mx2bk_: 'mx2_bakd' };
  function bytes(value) {
    if (value == null) return 0;
    value = String(value);
    return value.length * (/[^\u0000-ÿ]/.test(value) ? 2 : 1);
  }
  function usage(storage) {
    var total = 0, i, key;
    for (i = 0; i < storage.length; i++) { key = storage.key(i); if (key != null) total += bytes(key) + bytes(storage.getItem(key)); }
    return total;
  }
  function disposable(key) {
    key = String(key);
    for (var i = 0; i < ORDER.length; i++) if (key.indexOf(ORDER[i]) === 0) return true;
    return false;
  }
  function keysOf(storage, prefix) {
    var out = [], i, key;
    for (i = 0; i < storage.length; i++) { key = storage.key(i); if (key != null && key.indexOf(prefix) === 0) out.push(key); }
    return out;
  }
  /* target 以下になるまで、消してよい予備を古い順の種類から消す。消した量（バイト）を返す */
  function relieve(storage, target) {
    var freed = 0;
    for (var p = 0; p < ORDER.length; p++) {
      if (usage(storage) <= target) break;
      keysOf(storage, ORDER[p]).forEach(function (key) { freed += bytes(key) + bytes(storage.getItem(key)); storage.removeItem(key); });
      if (MARKER[ORDER[p]]) storage.removeItem(MARKER[ORDER[p]]);
    }
    return freed;
  }
  function isQuota(error) {
    return !!error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22 || error.code === 1014);
  }
  /* 容量不足で書けなかったら、予備を消して1回だけ書き直す。予備そのものの書き込みは諦める（本体の空きを優先） */
  function install(proto) {
    if (!proto || typeof proto.setItem !== 'function' || proto.setItem.mxGuarded) return false;
    var original = proto.setItem;
    var guarded = function (key, value) {
      try { return original.call(this, key, value); } catch (error) {
        if (!isQuota(error) || disposable(key) || !relieve(this, 0)) throw error;
        return original.call(this, key, value);
      }
    };
    guarded.mxGuarded = true;
    proto.setItem = guarded;
    return true;
  }
  return { SOFT: SOFT, TARGET: TARGET, bytes: bytes, usage: usage, disposable: disposable, relieve: relieve, isQuota: isQuota, install: install };
});
