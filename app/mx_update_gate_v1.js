(function(root,factory){
  'use strict';
  var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MXUpdateGate=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function parseSemver(value){
    var match=String(value||'').trim().match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/);
    return match?{core:[Number(match[1]),Number(match[2]),Number(match[3])],pre:match[4]?match[4].split('.'):[]}:null;
  }
  function compareSemver(a,b){
    a=parseSemver(a);b=parseSemver(b);if(!a||!b)return null;
    for(var i=0;i<3;i++)if(a.core[i]!==b.core[i])return a.core[i]<b.core[i]?-1:1;
    if(!a.pre.length&&!b.pre.length)return 0;if(!a.pre.length)return 1;if(!b.pre.length)return -1;
    for(i=0;i<Math.max(a.pre.length,b.pre.length);i++){
      if(a.pre[i]===undefined)return -1;if(b.pre[i]===undefined)return 1;if(a.pre[i]===b.pre[i])continue;
      var an=/^\d+$/.test(a.pre[i]),bn=/^\d+$/.test(b.pre[i]);if(an&&bn)return Number(a.pre[i])<Number(b.pre[i])?-1:1;if(an!==bn)return an?-1:1;return a.pre[i]<b.pre[i]?-1:1;
    }
    return 0;
  }
  function safeStoreUrl(platform,value){
    try{var url=new URL(String(value||''));if(url.protocol!=='https:')return null;if(platform==='ios'&&url.hostname!=='apps.apple.com')return null;if(platform==='android'&&(url.hostname!=='play.google.com'||url.pathname.indexOf('/store/apps/details')!==0))return null;return url.href;}catch(_){return null;}
  }
  function evaluatePolicy(policy,context){
    context=context||{};var platform=String(context.platform||''),current=String(context.currentVersion||'');
    if(!policy||policy.enabled!==true)return{blocked:false,reason:'disabled'};
    if(platform!=='ios'&&platform!=='android')return{blocked:false,reason:'unsupported-platform'};
    if(!Array.isArray(policy.publishedPlatforms)||policy.publishedPlatforms.indexOf(platform)<0)return{blocked:false,reason:'not-published'};
    var spec=policy.platforms&&policy.platforms[platform],minimum=spec&&String(spec.minimumVersion||''),available=spec&&String(spec.availableVersion||''),storeUrl=safeStoreUrl(platform,spec&&spec.storeUrl);
    if(!parseSemver(current)||!parseSemver(minimum)||!parseSemver(available)||!storeUrl)return{blocked:false,reason:'invalid-policy'};
    if(compareSemver(available,minimum)<0)return{blocked:false,reason:'minimum-not-published'};
    if(compareSemver(current,minimum)>=0)return{blocked:false,reason:'supported'};
    return{blocked:true,platform:platform,currentVersion:current,minimumVersion:minimum,availableVersion:available,storeUrl:storeUrl,message:typeof policy.message==='string'?policy.message.slice(0,160):''};
  }
  async function check(options){
    options=options||{};var platform=String(options.platform||''),url=String(options.policyUrl||'').trim();
    if(platform!=='ios'&&platform!=='android')return{blocked:false,reason:'unsupported-platform'};
    if(!url)return{blocked:false,reason:'not-configured'};
    var parsed;try{parsed=new URL(url);if(parsed.protocol!=='https:')return{blocked:false,reason:'invalid-policy-url'};}catch(_){return{blocked:false,reason:'invalid-policy-url'};}
    if(typeof options.fetch!=='function')return{blocked:false,reason:'fetch-unavailable'};
    var current;try{current=typeof options.getCurrentVersion==='function'?await options.getCurrentVersion():options.currentVersion;}catch(_){return{blocked:false,reason:'version-unavailable'};}
    var controller=typeof AbortController==='function'?new AbortController():null,timer=null;
    try{
      if(controller)timer=setTimeout(function(){controller.abort();},Math.max(500,Number(options.timeoutMs)||3500));
      var response=await options.fetch(parsed.href,{method:'GET',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller&&controller.signal});
      if(!response||!response.ok)return{blocked:false,reason:'policy-unavailable'};
      var policy=await response.json();return evaluatePolicy(policy,{platform:platform,currentVersion:current});
    }catch(_){return{blocked:false,reason:'policy-unavailable'};}finally{if(timer)clearTimeout(timer);}
  }
  function mount(result,options){
    if(!result||!result.blocked||typeof document==='undefined'||!document.body)return null;
    var old=document.getElementById('mxUpdateGate');if(old)return old;options=options||{};
    var gate=document.createElement('div');gate.id='mxUpdateGate';gate.className='mx-update-gate';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-labelledby','mxUpdateTitle');
    var card=document.createElement('div'),title=document.createElement('h1'),message=document.createElement('p'),versions=document.createElement('p'),button=document.createElement('button');card.className='mx-update-card';
    title.id='mxUpdateTitle';title.textContent='アップデートが必要です';message.textContent=result.message||'安全に学習を続けるため、最新版へ更新してください。';versions.className='mx-update-versions';versions.textContent='現在 '+result.currentVersion+' ／ 必要 '+result.minimumVersion+' 以上';button.type='button';button.textContent='ストアで更新する';button.onclick=function(){if(typeof options.openStore==='function')options.openStore(result.storeUrl);else if(typeof location!=='undefined')location.href=result.storeUrl;};
    card.appendChild(title);card.appendChild(message);card.appendChild(versions);card.appendChild(button);gate.appendChild(card);document.body.appendChild(gate);button.focus();return gate;
  }
  async function boot(options){var result=await check(options);if(result.blocked)mount(result,options);return result;}
  return{parseSemver:parseSemver,compareSemver:compareSemver,safeStoreUrl:safeStoreUrl,evaluatePolicy:evaluatePolicy,check:check,mount:mount,boot:boot};
});
