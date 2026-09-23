/* Loading only. This module deliberately has no API that can display an ad. */
(function(root){
  'use strict';
  function create(options){
    var now=options.now||Date.now, later=options.setTimeout||setTimeout, cancel=options.clearTimeout||clearTimeout;
    var epoch=now().toString(36)+'-'+Math.random().toString(36).slice(2), serial=0;
    var ready=null, flight=null, retry=null, highTried=false, failures=0, retryAt=0;
    var ttl=55*60*1000, loadMs=options.loadMs||8000;
    function publish(){if(options.changed)options.changed(snapshot());}
    function snapshot(){return {ready:!!ready,loading:!!flight,tier:ready&&ready.tier,failures:failures,retryAt:retryAt};}
    function usable(){return options.enabled();}
    function stopRetry(){if(retry!==null){cancel(retry);retry=null;}}
    function schedule(delay){
      stopRetry();retryAt=now()+delay;
      retry=later(function(){retry=null;ensure();},delay);publish();
    }
    function finish(attempt,ok){
      if(flight!==attempt)return; // Ignore timeouts, cancellations and stale native callbacks.
      cancel(attempt.timer);flight=null;
      if(ok&&usable()){
        ready={requestId:attempt.id,adId:attempt.unit,tier:attempt.tier,loadedAt:now()};
        failures=0;retryAt=0;stopRetry();publish();return;
      }
      ready=null;
      if(!usable()){publish();return;}
      if(attempt.tier==='high'){publish();ensure();return;}
      failures++;schedule(failures>=2?60000:20000);
    }
    function ensure(){
      if(!usable()||flight)return;
      if(ready&&now()-ready.loadedAt<ttl&&now()>=ready.loadedAt)return;
      ready=null;
      if(now()<retryAt)return;
      stopRetry();retryAt=0;
      var high=!highTried&&options.highUnit;
      if(high)highTried=true;
      var unit=high?options.highUnit:options.normalUnit;
      if(!unit){publish();return;}
      var attempt={id:epoch+'-'+(++serial),unit:unit,tier:high?'high':'normal',timer:null};
      flight=attempt;
      attempt.timer=later(function(){finish(attempt,false);},loadMs);
      publish();
      try{
        Promise.resolve(options.load({adId:unit,requestId:attempt.id})).then(function(result){
          finish(attempt,!!result&&result.requestId===attempt.id&&result.adUnitId===unit);
        },function(){finish(attempt,false);});
      }catch(e){finish(attempt,false);}
    }
    function take(){
      if(!usable()||!ready)return null;
      if(now()-ready.loadedAt>=ttl||now()<ready.loadedAt){ready=null;publish();ensure();return null;}
      var ticket=ready;ready=null;publish();return ticket;
    }
    function clear(){
      stopRetry();if(flight)cancel(flight.timer);flight=null;ready=null;retryAt=0;failures=0;highTried=false;publish();
    }
    // Start a fresh high-price attempt only after an actual impression, not a failed request.
    function consumed(){clear();}
    function setHighUnit(unit){if(options.highUnit===unit)return;clear();options.highUnit=unit;}
    function showFailed(){ready=null;highTried=true;failures++;schedule(failures>=2?60000:20000);}
    return {ensure:ensure,take:take,clear:clear,consumed:consumed,showFailed:showFailed,snapshot:snapshot,setHighUnit:setHighUnit};
  }
  root.MXAdPreload={create:create};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MXAdPreload;
})(typeof window!=='undefined'?window:globalThis);
