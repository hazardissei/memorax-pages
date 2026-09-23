/* v1.0.6: voluntary idiom entry / once-per-day offer after the first real ad. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MXUpgradeOffer=api;
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  var KEY='mx2_upgrade_offer_v1';
  function day(now){return new Date(now+9*60*60*1000).toISOString().slice(0,10);}
  function eligible(s,reason){
    return !!(s&&(s.platform==='ios'||s.platform==='android')&&s.ready&&!s.testing&&!s.noads&&!s.monthly&&
      (reason==='idioms'?!s.idioms:reason==='ad'&&!s.grace));
  }
  function createPolicy(storage,now){
    now=now||Date.now;
    var last='';
    try{var old=JSON.parse(storage.getItem(KEY)||'null');if(old&&/^\d{4}-\d{2}-\d{2}$/.test(old.lastAutoDay))last=old.lastAutoDay;}catch(e){}
    return {
      canShow:function(s,reason,firstAd){return eligible(s,reason)&&(reason!=='ad'||(firstAd===true&&last<day(now())));},
      record:function(reason){if(reason!=='ad')return true;var today=day(now());if(last>=today)return false;
        /* Fail closed if persistence fails: don't repeatedly interrupt on restart. */
        try{storage.setItem(KEY,JSON.stringify({lastAutoDay:today}));last=today;return true;}catch(e){return false;}}
    };
  }
  function mount(options){
    var doc=options.document||document,policy=createPolicy(options.storage||localStorage,options.now);
    var layer=null,resume=null,priorFocus=null,background=null,oldInert=false,busy=false,purchasePending=false,reason=null;
    function el(id){return layer&&layer.querySelector('#'+id);}
    function close(){
      if(!layer)return;
      var done=resume,back=priorFocus;
      resume=null;priorFocus=null;layer.remove();layer=null;busy=false;reason=null;
      if(background)background.inert=oldInert;
      background=null;doc.removeEventListener('keydown',key,true);
      if(back&&doc.contains(back)&&back.focus)back.focus({preventScroll:true});
      if(done)done();
    }
    function key(e){
      if(!layer)return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
      if(e.key==='Tab'){
        var nodes=Array.prototype.filter.call(layer.querySelectorAll('button:not([disabled]),a[href],summary'),function(n){return n.getClientRects().length>0;});
        if(!nodes.length)return;
        var first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey&&(doc.activeElement===first||!layer.contains(doc.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&(doc.activeElement===last||!layer.contains(doc.activeElement))){e.preventDefault();first.focus();}
      }
      if(layer.contains(e.target))e.stopPropagation();
      // Don't let document-level study shortcuts grade the card behind the modal.
      if(!layer.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}
    }
    function price(){return String(options.price()||'').replace(/^¥([\d,]+)$/,'$1円');}
    function refresh(){
      if(!layer)return;
      if(!eligible(options.state(),reason)){close();return;}
      var p=price();
      el('mxUpgradePrice').textContent=p?'月額'+p:'価格を確認中';
      el('mxUpgradeBuy').disabled=busy||!p;
      el('mxUpgradeRetry').hidden=!!p;
      el('mxUpgradeTerms').textContent=options.terms(p);
    }
    function show(source,done,firstAd){
      if(layer||doc.hidden||!policy.canShow(options.state(),source,firstAd))return false;
      if(source==='ad'&&options.blocked&&options.blocked())return false;
      if(!policy.record(source))return false;
      if(options.beforeOpen)options.beforeOpen();
      reason=source;resume=done||null;priorFocus=doc.activeElement;busy=purchasePending;
      layer=doc.createElement('div');layer.id='mxUpgradeOverlay';layer.className='mx-upgrade-overlay';
      layer.innerHTML='<section class="mx-upgrade-card" role="dialog" aria-modal="true" aria-labelledby="mxUpgradeTitle">'+
        '<button class="mx-upgrade-close" id="mxUpgradeClose" type="button" aria-label="閉じる">×</button>'+
        '<div class="mx-upgrade-content"><h2 id="mxUpgradeTitle">アップデートしよう！</h2>'+
        '<img class="mx-upgrade-mascot" src="achievement/memora-celebrate-v1.png" alt="メモラ君" width="1254" height="1254">'+
        '<ul class="mx-upgrade-benefits"><li><span aria-hidden="true">✓</span>広告完全フリー</li>'+
        '<li><span aria-hidden="true">✓</span>英熟語帳の利用</li>'+
        '<li><span aria-hidden="true">✓</span>今後追加されるすべての機能</li></ul></div>'+
        '<div class="mx-upgrade-actions"><div id="mxUpgradePrice" class="mx-upgrade-price" aria-live="polite"></div>'+
        '<button id="mxUpgradeBuy" class="mx-upgrade-buy" type="button">アップグレード</button>'+
        '<button id="mxUpgradeRetry" class="mx-upgrade-link" type="button">価格を再確認</button>'+
        '<div id="mxUpgradeStatus" class="mx-upgrade-status" role="status"></div>'+
        '<button id="mxUpgradeLater" class="mx-upgrade-later" type="button">今はしない</button>'+
        '<details class="mx-upgrade-details"><summary>購入条件・復元</summary><p id="mxUpgradeTerms"></p>'+
        '<p>契約中は、英熟語帳・熟語カットイン・今後追加される機能を含む全機能と広告削除を利用できます。</p>'+
        '<button id="mxUpgradeRestore" class="mx-upgrade-link" type="button">購入を復元</button> · '+
        '<a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener">利用規約</a> · '+
        '<a href="https://hazardissei.github.io/memorax-pages/privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a></details></div></section>';
      doc.body.appendChild(layer);
      background=doc.getElementById('app');if(background){oldInert=background.inert;background.inert=true;}
      el('mxUpgradeClose').onclick=close;el('mxUpgradeLater').onclick=close;
      layer.onclick=function(e){if(e.target===layer)close();};
      el('mxUpgradeBuy').onclick=function(){
        if(busy||purchasePending||!price()||!eligible(options.state(),reason))return;
        var owner=layer;
        busy=true;purchasePending=true;refresh();el('mxUpgradeStatus').textContent='購入を確認しています…';
        Promise.resolve().then(function(){return options.purchase();}).then(function(result){
          if(layer!==owner)return;
          el('mxUpgradeStatus').textContent=result&&result.state==='pending'?'承認待ちです。':result&&result.state==='failed'?'購入できませんでした。もう一度お試しください。':'';
        }).catch(function(){if(layer===owner)el('mxUpgradeStatus').textContent='購入できませんでした。もう一度お試しください。';})
          .finally(function(){purchasePending=false;busy=false;refresh();});
      };
      el('mxUpgradeRetry').onclick=function(){
        var b=el('mxUpgradeRetry');b.disabled=true;
        options.reloadPrice(function(){if(!layer)return;b.disabled=false;refresh();if(!price())el('mxUpgradeStatus').textContent='購入情報を取得できませんでした。接続を確認してください。';});
      };
      el('mxUpgradeRestore').onclick=function(){options.restore();};
      doc.addEventListener('keydown',key,true);refresh();
      setTimeout(function(){if(layer)el('mxUpgradeClose').focus({preventScroll:true});},0);
      return true;
    }
    return {show:show,close:close,refresh:refresh,isOpen:function(){return !!layer;}};
  }
  return {createPolicy:createPolicy,eligible:eligible,mount:mount,day:day,key:KEY};
});
