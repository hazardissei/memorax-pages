(function(root){
  'use strict';
  /*
   * Web公開時に、公開可能なSupabase設定だけをデプロイ環境で差し替える。
   * service role、Stripe secret、price ID、Webhook secretはここへ置かない。
   */
  root.MX_WEB_CONFIG=Object.freeze({
    supabaseUrl:'',
    supabaseAnonKey:'',
    functionsUrl:'',
    entitlementKey:'memorax.eitan.idioms.web'
  });
})(typeof window!=='undefined'?window:globalThis);
