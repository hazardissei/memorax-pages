(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MXTicketGift=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  var KEY='mx_ticket_gifts_seen_v1';
  function receiptKeys(s,user){
    if(!user||!s||s.auth!=='signed_in'||s.active!==true)return [];
    var codes=Array.isArray(s.codeGrants)?s.codeGrants:[],ids=codes.map(function(c){return user+':code:'+c;});/* 配布コード：キャンペーンごとに1回お祝い */
    if(s.referralRewarded)ids.push(user+':campaign');if(s.distributionClaimed&&!codes.length)ids.push(user+':distribution');return ids;
  }
  function createTracker(storage){
    var memory={};
    function seen(){try{var v=JSON.parse(storage.getItem(KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch(_){return {};}}
    return {
      pending:function(s,user){var v=seen();return receiptKeys(s,user).filter(function(k){return !v[k]&&!memory[k];});},
      mark:function(ids){var v=seen();ids.forEach(function(k){memory[k]=true;v[k]=Date.now();});var keys=Object.keys(v).sort(function(a,b){return v[b]-v[a];});keys.slice(256).forEach(function(k){delete v[k];});try{storage.setItem(KEY,JSON.stringify(v));}catch(_){}}
    };
  }
  function mount(client,options){
    options=options||{};var tracker=createTracker(client.storage),overlay=null,shown=[],owner=null,focus=null,overflow='',timer=null;
    function close(mark){
      if(!overlay||overlay.hidden)return;
      if(mark)tracker.mark(shown);
      overlay.hidden=true;shown=[];owner=null;document.body.style.overflow=overflow;
      if(focus&&document.contains(focus))focus.focus();
    }
    function build(){
      overlay=document.createElement('div');overlay.className='mx-ticket-gift-overlay';overlay.hidden=true;
      overlay.innerHTML='<section class="mx-ticket-gift-card" role="dialog" aria-modal="true" aria-labelledby="mxGiftTitle" aria-describedby="mxGiftRule">'+
        '<p class="mx-ticket-gift-tag">英熟語チケット</p>'+
        '<h2 id="mxGiftTitle">英熟語チケットを<br>受け取りました！</h2><p class="mx-ticket-gift-congrats">おめでとう！</p>'+
        '<img class="mx-ticket-gift-memora" src="achievement/memora-celebrate-v1.png" alt="メモら君がお祝いしています" width="230" height="230">'+
        '<div class="mx-ticket-gift-rule" id="mxGiftRule"><p class="mx-ticket-gift-summary"><strong class="mx-ticket-gift-duration">14日間</strong>英熟語帳を使えるチケットです</p><strong>1日100問で、その日は日数消費なし</strong><p>100問未満の日・使わない日は<br>1日分ずつ減ります。</p></div>'+
        '<p class="mx-ticket-gift-hint">残り日数は、単語帳の切り替え画面で確認できます。</p>'+
        '<button class="mx-ticket-primary" type="button" data-gift="open">英熟語帳を開く</button><button class="mx-ticket-gift-later" type="button" data-gift="later">あとで</button></section>';
      document.body.appendChild(overlay);
      overlay.querySelector('[data-gift="open"]').onclick=function(){close(true);if(options.openIdioms)options.openIdioms();};
      overlay.querySelector('[data-gift="later"]').onclick=function(){close(true);};
      overlay.addEventListener('keydown',function(e){
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}
        if(e.key==='Tab'){var a=overlay.querySelector('[data-gift="open"]'),b=overlay.querySelector('[data-gift="later"]');
          if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus();}
          else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus();}}
      });
    }
    function pump(){
      if(timer){clearTimeout(timer);timer=null;}
      var s=client.snapshot(),user=client.sessionUser,ids=tracker.pending(s,user);
      if(overlay&&!overlay.hidden){
        if(owner!==user||!s.active){close(false);return;}
        shown=Array.from(new Set(shown.concat(ids)));return;
      }
      if(!ids.length)return;
      if(document.hidden||(options.canShow&&!options.canShow())){timer=setTimeout(pump,750);return;}
      if(!overlay)build();
      owner=user;shown=ids;focus=document.activeElement;overflow=document.body.style.overflow;document.body.style.overflow='hidden';
      overlay.hidden=false;overlay.querySelector('[data-gift="open"]').focus();
    }
    var unsubscribe=client.subscribe(pump);document.addEventListener('visibilitychange',pump);
    return {destroy:function(){if(timer)clearTimeout(timer);unsubscribe();document.removeEventListener('visibilitychange',pump);close(false);if(overlay)overlay.remove();}};
  }
  return {mount:mount,createTracker:createTracker,receiptKeys:receiptKeys};
});
