(function(root){
  'use strict';
  /* 強制アップデートのポリシー配信先（2026-09-23）。mx_update_gate_v1.js が起動時に読む。
     最低版・公開版・ストアURLは JSON 側で持つので、アプリを出し直さずに切り替えられる。
     空文字にすると通信せず誰も止めない。index.html には書かない（tests/update_gate.test.js の規約）。 */
  root.MX_UPDATE_POLICY_URL='https://hazardissei.github.io/memorax-pages/update-policy-eitan.json';
})(typeof window!=='undefined'?window:globalThis);
