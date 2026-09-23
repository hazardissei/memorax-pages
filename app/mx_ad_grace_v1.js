(function(root){
  'use strict';
  const WEEK=7*24*60*60*1000;
  const STUDY_DAYS=5;
  function jstDay(now){return new Date(now+9*3600000).toISOString().slice(0,10);}
  function validDay(raw){
    const match=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
    if(!match)return null;
    const day=match[1]+'-'+match[2].padStart(2,'0')+'-'+match[3].padStart(2,'0');
    const date=new Date(day+'T00:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day?day:null;
  }
  function createStudyDays(scope){
    const key='memorax_'+scope+'_ad_study_days_v1';
    let days=[],expired=false,failed=false;
    function persist(){
      try{const raw=JSON.stringify({v:1,days:days,expired:expired});localStorage.setItem(key,raw);if(localStorage.getItem(key)!==raw)throw Error('save_failed');}
      catch(_){failed=true;}
    }
    try{
      const raw=localStorage.getItem(key);
      if(raw!==null){
        const saved=JSON.parse(raw);
        if(!saved||saved.v!==1||!Array.isArray(saved.days)||saved.days.length>STUDY_DAYS||
          saved.days.some((d,i)=>validDay(d)!==d||(i>0&&d<=saved.days[i-1]))||
          (saved.expired===true&&saved.days.length!==STUDY_DAYS))throw Error('invalid_usage');
        days=saved.days;expired=saved.expired===true;
      }else{
        // Migrate actual saved learning days once. Installation age alone is
        // never evidence of study. Empty days and tutorial-only days do not count.
        const history=JSON.parse(localStorage.getItem('mx2_daily')||'{}'),today=jstDay(Date.now());
        days=[...new Set(Object.keys(history||{}).filter(d=>history[d]&&Number(history[d].answers)>0)
          .map(validDay).filter(d=>d&&d<=today))].sort().slice(0,STUDY_DAYS);
        persist();
      }
    }catch(_){failed=true;}
    function active(){
      if(failed)return true;
      if(expired)return false;
      if(days.length===STUDY_DAYS&&jstDay(Date.now())>days[STUDY_DAYS-1]){
        expired=true;persist();return failed;
      }
      return true;
    }
    function recordAnswer(){
      if(!active()||failed)return;
      const today=jstDay(Date.now()),last=days[days.length-1];
      if(days.length>=STUDY_DAYS||today<=last)return;
      days.push(today);persist();
    }
    const api={isActive:active,recordAnswer:recordAnswer,
      getState:function(){return {active:active(),usedDays:days.length,remainingDays:Math.max(0,STUDY_DAYS-days.length),todayUsed:days.includes(jstDay(Date.now())),error:failed?'storage':null,ready:true};}};
    api.ready=Promise.resolve(api);return api;
  }
  function create(scope,legacyFirstSeen){
    if(scope==='eitan')return createStudyDays(scope);
    const key='memorax_'+scope+'_ad_grace_v1';
    let first=0,expired=false,ready=false;
    const now=Date.now();
    try{const s=JSON.parse(localStorage.getItem(key)||'null');if(s&&Number.isFinite(s.first)&&s.first>0){first=s.first;expired=s.expired===true;}}catch(_){}
    const legacy=Number(legacyFirstSeen)||0;
    if(!first)first=legacy>0&&legacy<=now?legacy:now;
    function persist(){try{localStorage.setItem(key,JSON.stringify({first:first,expired:expired}));}catch(_){}}
    function active(){
      if(!ready)return true;
      if(expired)return false;
      if(Date.now()-first>=WEEK){expired=true;persist();return false;}
      return true;
    }
    const initialized=Promise.resolve().then(async function(){
      const cap=root.Capacitor;
      if(cap&&cap.isNativePlatform&&cap.isNativePlatform()){
        const plugin=cap.Plugins&&cap.Plugins.StoreKit2;
        if(plugin&&typeof plugin.getAdGraceStart==='function'){
          try{const result=await plugin.getAdGraceStart({legacyFirstSeen:first});
            const value=Number(result&&result.firstSeenAt);
            if(Number.isFinite(value)&&value>0){first=value;}
          }catch(_){/* Offline/older bridge: keep the persisted, conservative first-launch date. */}
        }
      }
      ready=true;persist();active();return api;
    });
    const api={isActive:active,ready:initialized,remainingMs:function(){return active()?Math.max(0,first+WEEK-Date.now()):0;},getState:function(){return {firstSeenAt:first,expiresAt:first+WEEK,active:active(),ready:ready};}};
    return api;
  }
  root.MXAdGrace={create:create,weekMs:WEEK,studyDays:STUDY_DAYS};
})(typeof window==='undefined'?globalThis:window);
