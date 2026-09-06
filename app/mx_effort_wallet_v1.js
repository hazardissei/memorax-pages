(function(root,factory){
  'use strict';var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MXEffortWallet=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var KEY='memorax_eitan_wallet_v105',LEGACY_KEY='mx2_wallet',SCOPE='eitan',MAX_EVENTS=1024;
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function safeInt(value){var n=Math.floor(Number(value)||0);return Number.isFinite(n)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,n)):0;}
  function record(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
  function eventSequence(id){var m=/^eitan:(\d+):/.exec(String(id||''));return m?safeInt(m[1]):0;}
  function cleanState(value){
    var src=record(value)?value:{};if(src.appScope&&src.appScope!==SCOPE)src={};
    var out={schemaVersion:2,appScope:SCOPE,pt:safeInt(src.pt),seq:safeInt(src.seq),prunedThrough:safeInt(src.prunedThrough),awarded:{},events:{},eventOrder:[]};
    if(record(src.awarded))Object.keys(src.awarded).slice(-4096).forEach(function(k){out.awarded[String(k).slice(0,160)]=src.awarded[k];});
    if(record(src.events))Object.keys(src.events).forEach(function(id){var e=src.events[id];if(record(e)&&Number.isInteger(e.amount)&&e.amount>=0)out.events[id]={amount:safeInt(e.amount),milestoneKeys:Array.isArray(e.milestoneKeys)?e.milestoneKeys.map(String).slice(0,16):[]};});
    var order=Array.isArray(src.eventOrder)?src.eventOrder.map(String):Object.keys(out.events);var seen={};order.forEach(function(id){if(out.events[id]&&!seen[id]){seen[id]=1;out.eventOrder.push(id);}});
    if(!Object.prototype.hasOwnProperty.call(src,'prunedThrough')&&out.eventOrder.length>=MAX_EVENTS){var oldest=Math.min.apply(null,out.eventOrder.map(eventSequence).filter(function(n){return n>0;}));if(Number.isFinite(oldest))out.prunedThrough=Math.max(0,oldest-1);}
    while(out.eventOrder.length>MAX_EVENTS){var old=out.eventOrder.shift();out.prunedThrough=Math.max(out.prunedThrough,eventSequence(old));delete out.events[old];}
    return out;
  }
  function create(options){
    options=options||{};var storage=options.storage,key=String(options.key||KEY),legacyKey=String(options.legacyKey||LEGACY_KEY),state=cleanState(null);
    function parse(raw){try{return raw?JSON.parse(raw):null;}catch(_){return null;}}
    function save(){if(storage)try{storage.setItem(key,JSON.stringify(state));}catch(_){}return clone(state);}
    function load(){
      var raw=null,parsed=null;if(storage)try{raw=storage.getItem(key);parsed=parse(raw);}catch(_){}
      if(raw&& !parsed&&storage)try{storage.setItem(key+'_corrupt',raw);}catch(_){}
      if(!parsed&&storage)try{var legacy=parse(storage.getItem(legacyKey));if(record(legacy)&&(!legacy.appScope||legacy.appScope===SCOPE))parsed=legacy;}catch(_){}
      state=cleanState(parsed);save();return clone(state);
    }
    function startAttempt(kind,subject){state.seq=safeInt(state.seq)+1;var id=SCOPE+':'+state.seq+':'+String(kind||'question').replace(/[^a-z0-9_-]/gi,'').slice(0,20)+':'+String(subject||'').replace(/[^a-z0-9_-]/gi,'').slice(0,36);save();return id;}
    function hasMilestone(keyName){return Object.prototype.hasOwnProperty.call(state.awarded,String(keyName));}
    function award(eventId,baseAmount,milestones){
      eventId=String(eventId||'');var eventSeq=eventSequence(eventId);if(!eventSeq||eventSeq>state.seq||eventSeq<=state.prunedThrough||Object.prototype.hasOwnProperty.call(state.events,eventId))return null;
      var total=safeInt(baseAmount),keys=[];milestones=(Array.isArray(milestones)?milestones:[]);
      milestones.forEach(function(item){var k=String(item&&item.key||'').slice(0,160);if(!k||hasMilestone(k)||keys.indexOf(k)>=0)return;keys.push(k);total+=safeInt(item.amount);});
      state.pt=safeInt(state.pt+total);state.events[eventId]={amount:total,milestoneKeys:keys};state.eventOrder.push(eventId);keys.forEach(function(k){state.awarded[k]=eventId;});
      while(state.eventOrder.length>MAX_EVENTS){var old=state.eventOrder.shift();state.prunedThrough=Math.max(state.prunedThrough,eventSequence(old));delete state.events[old];}
      save();return{id:eventId,amount:total,milestoneKeys:keys};
    }
    function undo(eventId){
      eventId=String(eventId&&eventId.id||eventId||'');var receipt=state.events[eventId];if(!receipt)return null;
      state.pt=Math.max(0,safeInt(state.pt)-safeInt(receipt.amount));receipt.milestoneKeys.forEach(function(k){if(state.awarded[k]===eventId)delete state.awarded[k];});delete state.events[eventId];state.eventOrder=state.eventOrder.filter(function(id){return id!==eventId;});save();return{id:eventId,amount:receipt.amount,milestoneKeys:receipt.milestoneKeys.slice()};
    }
    return{load:load,snapshot:function(){return clone(state);},startAttempt:startAttempt,hasMilestone:hasMilestone,award:award,undo:undo};
  }
  return{create:create,cleanState:cleanState,KEY:KEY,LEGACY_KEY:LEGACY_KEY,SCOPE:SCOPE,MAX_EVENTS:MAX_EVENTS};
});
