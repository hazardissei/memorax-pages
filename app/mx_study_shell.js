/* MemoraX study chrome. Display only: never grades, persists or changes a queue. */
(function(root){
  'use strict';
  function measure(items,key,seen){
    var ids=new Set(),done=0;
    (items||[]).forEach(function(item){var id=key(item);if(id==null||ids.has(id))return;ids.add(id);if(seen(item))done++;});
    return {total:ids.size,done:done,percent:ids.size?Math.min(100,done/ids.size*100):0};
  }
  function normalize(model){
    model=model||{};var total=Math.max(0,Math.floor(Number(model.total)||0)),done=Math.max(0,Math.min(total,Math.floor(Number(model.done)||0)));
    return Object.assign({},model,{total:total,done:done,percent:total?done/total*100:0});
  }
  if(typeof module==='object'&&module.exports)module.exports={measure:measure,normalize:normalize};
  if(!root.document)return;
  var doc=root.document;
  function setText(el,value){value=String(value==null?'':value);if(el.textContent!==value)el.textContent=value;}
  function setClass(el,name,on){if(el.classList.contains(name)!==!!on)el.classList.toggle(name,!!on);}
  function register(config){
    var screen=doc.querySelector(config.screen);if(!screen||screen.querySelector('#mxStudyHead'))return;
    screen.classList.add('mx-study-surface');if(config.family)screen.classList.add('mx-study-'+config.family);
    if(config.prose)screen.classList.add('mx-study-prose');
    screen.style.setProperty('--mx-study-accent',config.color);
    var head=doc.createElement('header');head.id='mxStudyHead';head.setAttribute('aria-label','学習中の範囲と進捗');
    head.innerHTML='<div class="mx-study-top"><span id="mxStudyPosition"></span><span id="mxStudyCount"></span><div id="mxStudyControls"></div></div><div id="mxStudyScope"></div><div class="mx-study-context"><span id="mxStudyMode"></span><span id="mxStudyStatus"></span></div><div id="mxStudyGauge" role="progressbar" aria-label="この範囲の学習済み割合" aria-valuemin="0" aria-valuemax="100"><i class="mx-study-fill"></i></div>';
    var controls=head.querySelector('#mxStudyControls');
    (config.controls||[]).forEach(function(action){var el=doc.querySelector(action.selector);if(!el)return;if(action.label)el.setAttribute('aria-label',action.label);if(action.glyph)setText(el,action.glyph);el.classList.add('mx-study-action');controls.appendChild(el);});
    var watched=[];
    (config.legacy||[]).forEach(function(selector){doc.querySelectorAll(selector).forEach(function(el){el.classList.add('mx-study-legacy');el.setAttribute('aria-hidden','true');watched.push(el);});});
    screen.insertBefore(head,screen.firstChild);
    var position=head.querySelector('#mxStudyPosition'),count=head.querySelector('#mxStudyCount'),scope=head.querySelector('#mxStudyScope'),mode=head.querySelector('#mxStudyMode'),status=head.querySelector('#mxStudyStatus'),gauge=head.querySelector('#mxStudyGauge'),fill=gauge.firstElementChild;
    var pending=false;
    function refresh(){
      pending=false;
      var active=!screen.hidden&&!screen.classList.contains('hidden')&&root.getComputedStyle(screen).display!=='none';
      setClass(doc.body,'mx-study-open',active);
      if(!active)return;
      var m=normalize(config.read());
      setText(position,m.position||'学習中');setText(count,'全'+m.total.toLocaleString('ja-JP')+'問');
      count.setAttribute('aria-label',(m.scope||'この範囲')+' 全'+m.total+'問');
      setText(scope,m.scope||config.subject);setText(mode,[m.kind,m.mode].filter(Boolean).join(' · '));
      var displayPercent=m.done&&m.percent<.1?'<0.1':String(Math.round(m.percent*10)/10);
      setText(status,'学習済み '+displayPercent+'%');
      fill.style.width=m.percent+'%';gauge.setAttribute('aria-valuenow',String(m.percent));
      gauge.setAttribute('aria-valuetext',m.total+'問中'+m.done+'問を学習済み');gauge.title=m.total+'問中'+m.done+'問を学習済み';
      if(m.color&&screen.style.getPropertyValue('--mx-study-accent')!==m.color)screen.style.setProperty('--mx-study-accent',m.color);
      setClass(screen,'mx-study-long',!!m.long);
    }
    function schedule(){if(!pending){pending=true;queueMicrotask(refresh);}}
    var observer=new MutationObserver(schedule);
    watched.forEach(function(el){observer.observe(el,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});});
    observer.observe(screen,{attributes:true,attributeFilter:['class','hidden','style']});
    (config.watch||[]).forEach(function(selector){var el=doc.querySelector(selector);if(el)observer.observe(el,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','hidden']});});
    root.addEventListener('resize',schedule);refresh();
    return {refresh:refresh,disconnect:function(){observer.disconnect();root.removeEventListener('resize',schedule);}};
  }
  root.MXStudyShell={measure:measure,normalize:normalize,register:register};
})(typeof window!=='undefined'?window:globalThis);
