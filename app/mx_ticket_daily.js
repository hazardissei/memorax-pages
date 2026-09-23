(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MXTicketDaily=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  var KEY='mx2_ticket_daily_seen_v1';
  function achievementKey(s,user,now){
    if(!user||!s||s.auth!=='signed_in'||s.active!==true||s.error||!(s.remainingDays>0)
      ||s.dailyGoal!==100||!Number.isInteger(s.dailyAnswers)||s.dailyAnswers<100||!Number.isFinite(now))return null;
    var day=new Date(now+9*3600000).toISOString().slice(0,10);
    return s.day===day?user+':'+day:null;
  }
  function createTracker(storage){
    var memory={};
    function read(){try{var v=JSON.parse(storage.getItem(KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch(_){return {};}}
    return {
      pending:function(key){return !!(key&&!memory[key]&&!read()[key]);},
      mark:function(key){
        var v=read();memory[key]=true;v[key]=Date.now();
        Object.keys(v).sort(function(a,b){return v[b]-v[a];}).slice(512).forEach(function(k){delete v[k];});
        try{storage.setItem(KEY,JSON.stringify(v));}catch(_){}
      }
    };
  }
  function mount(client,options){
    options=options||{};
    var tracker=createTracker(client.storage),overlay=null,ownerKey=null,resume=null,focus=null,overflow='',timer=null,destroyed=false;
    function candidate(){
      if(options.eligible&&!options.eligible())return null;
      // An in-flight undo must settle before we claim that today is protected.
      if((client.queue||[]).some(function(e){return e.revision===2;}))return null;
      return achievementKey(client.snapshot(),client.sessionUser,client.serverTime());
    }
    function isOpen(){return !!(overlay&&!overlay.hidden);}
    function close(advance){
      if(!isOpen())return;
      var next=resume;resume=null;ownerKey=null;overlay.hidden=true;document.body.style.overflow=overflow;
      if(focus&&document.contains(focus))focus.focus();
      if(options.onClose)options.onClose();
      if(advance&&next)next();
    }
    function build(){
      overlay=document.createElement('div');overlay.className='mx-ticket-daily-overlay';overlay.hidden=true;
      overlay.innerHTML='<section class="mx-ticket-daily-card" role="dialog" aria-modal="true" aria-labelledby="mxDailyTitle" aria-describedby="mxDailyRule">'+
        '<p class="mx-ticket-daily-tag">英熟語チケット</p><h2 id="mxDailyTitle"><span>100</span>問達成！</h2><p class="mx-ticket-daily-congrats">おめでとう！</p>'+
        '<div class="mx-ticket-daily-art"><img src="achievement/ticket-100-celebration-v1.png" alt="チケットを持ったメモら君がお祝いしています" width="1024" height="1536"></div>'+
        '<div class="mx-ticket-daily-rule" id="mxDailyRule"><p>本日の英熟語チケット</p><strong>今日はチケットの<br>日数が減りません</strong><p>残り日数はそのままです</p></div>'+
        '<button type="button" class="mx-ticket-daily-continue">学習を続ける</button></section>';
      document.body.appendChild(overlay);
      overlay.querySelector('button').onclick=function(){close(true);};
      overlay.addEventListener('keydown',function(e){
        // Do not let an arrow key grade the answer behind this celebration.
        e.stopPropagation();
        if(e.key==='Escape'){e.preventDefault();close(true);}
        else if(e.key==='Tab'){e.preventDefault();overlay.querySelector('button').focus();}
      });
    }
    function show(key,next){
      if(!overlay)build();
      ownerKey=key;resume=next||null;focus=document.activeElement;overflow=document.body.style.overflow;
      document.body.style.overflow='hidden';
      // Mark on display, so closing/restarting the app cannot repeat the cut-in.
      tracker.mark(key);overlay.hidden=false;overlay.querySelector('button').focus();
    }
    function schedule(){if(!destroyed&&!timer)timer=setTimeout(refresh,750);}
    function refresh(){
      if(timer){clearTimeout(timer);timer=null;}
      if(destroyed)return;
      var key=candidate();
      if(isOpen()){
        if(key!==ownerKey){close(true);return;}
        schedule();return;
      }
      if(!tracker.pending(key))return;
      if(document.hidden||(options.canShow&&!options.canShow(false))){schedule();return;}
      show(key);schedule();
    }
    function atBoundary(next){
      if(destroyed)return false;
      if(isOpen())return true;
      var key=candidate();
      if(!tracker.pending(key)||document.hidden||(options.canShow&&!options.canShow(true)))return false;
      show(key,next);schedule();return true;
    }
    var unsubscribe=client.subscribe(refresh);
    document.addEventListener('visibilitychange',refresh);
    return {refresh:refresh,atBoundary:atBoundary,isOpen:isOpen,destroy:function(){
      destroyed=true;if(timer)clearTimeout(timer);unsubscribe();document.removeEventListener('visibilitychange',refresh);close(false);if(overlay)overlay.remove();
    }};
  }
  return {mount:mount,achievementKey:achievementKey,createTracker:createTracker,KEY:KEY};
});
