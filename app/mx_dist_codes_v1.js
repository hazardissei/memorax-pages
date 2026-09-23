(function(root){
  'use strict';
  /* 配布コード（2026-09-20 本人指定：全員共通のコードのみ・サーバーなし）。
     X などで公開する共通コードを、平文ではなく SHA-256 で同梱する。
     - id      : キャンペーン識別子（1端末・1 Apple ID につき id ごとに1回だけ受け取れる）
     - hash    : 正規化したコード（NFKC → 大文字 → 英数字以外を除去）の SHA-256（16進小文字）
     - expires : 受け取れる最終日（日本時間・その日いっぱい）。受け取り済みの日数はこの日を過ぎても続く
     - days    : 付与日数（100問達成日は消費しない。仕組みは mx_ticket_local.js）
     ハッシュは `node scripts/dist_code_hash.cjs <コード>` で作る。コードと期限を変えるにはアプリ更新が必要なので、
     2本目以降を配りたくなったら、次のアプリ更新で campaigns に追加する。 */
  root.MX_DIST_CODES=Object.freeze({
    version:1,
    campaigns:[
      {id:'2026-12',hash:'6ef0dee91100e421000cfbb99c1d2ba3ee03dfd5d6b1bd46a98aa6d0389a3a1b',expires:'2026-12-31',days:14}/* 2026-09-21 本人指定：まず1本だけ。コード文字列は本人管理（リポジトリに平文なし） */
    ]
  });
})(typeof window!=='undefined'?window:globalThis);
