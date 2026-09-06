(function(root){
  'use strict';
  try{
    var capacitor=root.Capacitor;
    if(capacitor&&capacitor.isNativePlatform&&capacitor.isNativePlatform()){
      document.write('<scr'+'ipt src="eitan_'+'idioms_v1.js" charset="utf-8"></scr'+'ipt><scr'+'ipt src="eitan_'+'idiomex_v1.js" charset="utf-8"></scr'+'ipt>');
    }
  }catch(_){}
})(window);
