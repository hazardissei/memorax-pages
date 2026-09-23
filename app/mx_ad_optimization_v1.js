/* Optional, consented measurement. Never owns answer counts or presents ads.
   personalized: 既定true（設定でオフにできる）。年齢は聞かず全員18歳以上の前提。実際の配信可否はATT承認×UMPをネイティブが判定する（2026-09-16）。 */
(function(root){
  'use strict';
  var EXP='eitan_floor_20260909';
  function preferences(storage){
    var p={};try{p=JSON.parse(storage.getItem('mx2_adprivacy')||'{}')||{};}catch(e){}
    return {personalized:p.personalized!==false,analytics:p.analytics===true};
  }
  function savePreferences(storage,p){
    var clean={personalized:p.personalized!==false,analytics:p.analytics===true};
    storage.setItem('mx2_adprivacy',JSON.stringify(clean));return clean;
  }
  function create(o){
    var now=o.now||Date.now,random=o.random||Math.random,storage=o.storage,enabled=false,variant='high_first';
    var lastDay='',lastDismiss=null,shown={},paid={},dismissed={},order=[];
    function emit(name,params){if(!enabled)return;try{Promise.resolve(o.send({name:name,params:Object.assign({experiment:EXP,variant:variant},params||{})})).catch(function(){});}catch(e){}}
    function configure(allowed,available){
      enabled=allowed===true&&available===true;
      if(!enabled){lastDismiss=null;lastDay='';shown={};paid={};dismissed={};order=[];return variant='high_first';}
      try{var saved=JSON.parse(storage.getItem('mx2_adexperiment')||'null');
        if(!saved||saved.id!==EXP||['all_prices','high_first'].indexOf(saved.variant)<0){saved={id:EXP,variant:random()<0.5?'all_prices':'high_first'};storage.setItem('mx2_adexperiment',JSON.stringify(saved));}
        variant=saved.variant;
      }catch(e){enabled=false;return variant='high_first';}
      emit('mx_ad_enrolled');return variant;
    }
    function active(){if(!enabled)return;var day=new Date(now()).toISOString().slice(0,10);if(day!==lastDay){lastDay=day;emit('mx_ad_active');}}
    function answer(){active();if(lastDismiss){var ms=now()-lastDismiss.at;if(ms>=0&&ms<=120000)emit('mx_ad_resume',{elapsed_ms:ms});lastDismiss=null;}}
    function show(id,tier){if(!enabled||shown[id])return;shown[id]=true;order.push(id);if(order.length>100){var old=order.shift();delete shown[old];delete paid[old];delete dismissed[old];}emit('mx_ad_show',{tier:tier});}
    function revenue(info){if(!enabled||!info||!shown[info.requestId]||paid[info.requestId])return;var v=Number(info.value);if(!Number.isFinite(v)||v<0||v>1000||!/^[A-Z]{3}$/.test(info.currency||''))return;paid[info.requestId]=true;emit('mx_ad_paid',{value:v,currency:info.currency,precision:Number(info.precision)||0});}
    function dismiss(id){if(!enabled||!shown[id]||dismissed[id])return;dismissed[id]=true;emit('mx_ad_dismiss');lastDismiss={at:now(),id:id};}
    function leave(){if(!lastDismiss)return;var ms=now()-lastDismiss.at;if(ms>=0&&ms<=120000)emit('mx_ad_leave',{elapsed_ms:ms});lastDismiss=null;}
    return {configure:configure,variant:function(){return variant;},enabled:function(){return enabled;},active:active,answer:answer,show:show,revenue:revenue,dismiss:dismiss,leave:leave,
      opportunity:function(ready){active();emit('mx_ad_opportunity',{ready:ready?1:0});},failure:function(){emit('mx_ad_show_failed');}};
  }
  root.MXAdOptimization={create:create,preferences:preferences,savePreferences:savePreferences,experiment:EXP};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MXAdOptimization;
})(typeof window!=='undefined'?window:globalThis);
