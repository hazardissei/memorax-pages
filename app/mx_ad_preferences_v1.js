(function(root){
  'use strict';
  root.MXAdPreferences={open:function(o){
    var box=o.element,p=o.preferences;
    box.innerHTML='<h2 style="font-size:20px;margin:0 0 18px">広告と利用状況の設定</h2>'
      +'<label style="display:flex;gap:12px;align-items:center"><input type="checkbox" id="mxAdPersonal" style="width:20px;height:20px;flex-shrink:0">自分に合わせた広告を許可する</label>'
      +'<p style="font-size:14px;line-height:1.7">iOSの「トラッキング」の許可とGoogleの同意設定も反映します。オフにしても広告の回数や学習機能は変わりません。</p>'
      +(o.measurementAvailable?'<label style="display:flex;gap:12px;align-items:center;margin-top:20px"><input type="checkbox" id="mxAdAnalytics" style="width:20px;height:20px;flex-shrink:0">利用状況の計測を許可する</label><p style="font-size:14px;line-height:1.7">広告の表示・収益・学習再開のタイミングと端末情報をGoogle Analyticsに送り、使いやすさの改善に利用します。単語・解答内容・メモは送りません。いつでも停止できます。</p>':'')
      +'<p style="font-size:14px"><a href="https://policies.google.com/technologies/partner-sites?hl=ja" target="_blank" rel="noopener">Googleによるデータの利用</a></p>'
      +'<p id="mxAdPrefsError" role="status" style="font-size:14px"></p><button type="button" class="opt" id="mxAdPrefsSave" style="width:100%">保存</button><button type="button" class="plink" id="mxAdPrefsClose" style="display:block;margin:16px auto 0">閉じる</button>';
    var personal=box.querySelector('#mxAdPersonal'),analytics=box.querySelector('#mxAdAnalytics');
    personal.checked=p.personalized;if(analytics)analytics.checked=p.analytics;
    box.querySelector('#mxAdPrefsClose').onclick=o.close;
    box.querySelector('#mxAdPrefsSave').onclick=function(){
      try{o.save({personalized:personal.checked,analytics:analytics?analytics.checked:p.analytics});o.close();}
      catch(e){box.querySelector('#mxAdPrefsError').textContent='保存できませんでした。設定は変更されていません。';}
    };
  }};
})(window);
