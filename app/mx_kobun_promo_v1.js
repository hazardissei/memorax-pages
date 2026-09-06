(function(root,factory){
  'use strict';var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MXKobunPromo=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function parse(value){
    try{
      var url=new URL(String(value||''));
      if(url.protocol!=='https:'||url.hostname!=='apps.apple.com'||url.pathname.indexOf('/jp/app/')!==0)return null;
      var match=url.pathname.match(/\/id(\d+)(?:\/|$)/);if(!match)return null;
      return{web:url.href,id:match[1],native:'itms-apps://itunes.apple.com/app/id'+match[1]};
    }catch(_){return null;}
  }
  function resolve(config){return parse(config&&config.url);}
  return{parse:parse,resolve:resolve};
});
