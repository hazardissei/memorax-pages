/* Shared presentation only. Callers own answer records, persistence and navigation. */
(function(root){
  'use strict';
  function count(n){return Math.max(0,Math.floor(Number(n)||0));}
  function normalize(m){
    m=Object.assign({},m);m.solved=count(m.solved);
    m.correct=m.correct==null?null:Math.min(m.solved,count(m.correct));
    m.total=m.total==null?null:count(m.total);
    m.kind=m.kind||'session';
    m.title=m.title||({section:'セクション達成！',milestone:m.solved+'問、おつかれさま！',practice:'操作練習クリア！',session:'今回の学習クリア！'}[m.kind]);
    return m;
  }
  function createTracker(){var rows=[];return {
    add:function(id,ok,eventId){if(eventId&&rows.some(function(r){return r.eventId===eventId;}))return;rows.push({id:id,ok:ok,eventId:eventId});},
    undo:function(eventId){var i=rows.findIndex(function(r){return r.eventId===eventId;});if(i>=0)rows.splice(i,1);},
    reset:function(){rows=[];},
    summary:function(offset){var part=rows.slice(count(offset));return {solved:part.length,correct:part.some(function(r){return r.ok==null;})?null:part.filter(function(r){return r.ok;}).length,ids:Array.from(new Set(part.map(function(r){return r.id;})))};}
  };}
  if(typeof module==='object'&&module.exports)module.exports={normalize:normalize,createTracker:createTracker};
  if(!root.document)return;
  var doc=root.document,dialog=null,returnFocus=null,exit=null;
  var script=doc.currentScript,base=new URL('.',script?script.src:doc.baseURI);
  function node(tag,cls,text){var e=doc.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  function close(){if(!dialog)return;dialog.close();dialog.remove();dialog=null;exit=null;doc.body.classList.remove('mx-achievement-open');if(returnFocus&&returnFocus.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;}
  function show(model,actions){
    close();var m=normalize(model);actions=actions||{};returnFocus=doc.activeElement;
    dialog=node('dialog','mx-achievement');dialog.id='mxAchievement';dialog.setAttribute('aria-labelledby','mxAchievementTitle');
    dialog.style.setProperty('--mx-achievement-accent',m.color||'#4b5563');
    var content=node('div','mx-achievement-content');dialog.appendChild(content);
    var eyebrow=node('div','mx-achievement-eyebrow',m.subject||'Memora X');content.appendChild(eyebrow);
    var hero=node('div','mx-achievement-hero'),img=node('img');img.src=new URL('achievement/memora-celebrate-v1.png',base).href;img.alt='両手を上げてお祝いするメモラ君';img.width=1254;img.height=1254;img.decoding='async';hero.appendChild(img);content.appendChild(hero);
    var title=node('h1','mx-achievement-title',m.title);title.id='mxAchievementTitle';title.tabIndex=-1;content.appendChild(title);
    content.appendChild(node('p','mx-achievement-message',m.message||'一つずつ、ちゃんと前に進んでる。'));
    var scope=node('section','mx-achievement-scope');scope.setAttribute('aria-label','取り組んだ範囲');
    scope.appendChild(node('div','mx-achievement-label','取り組んだ範囲'));
    scope.appendChild(node('div','mx-achievement-scope-name',m.scope||'今回の学習'));
    scope.appendChild(node('div','mx-achievement-mode',[m.mode,m.total==null?null:'対象 全'+m.total.toLocaleString('ja-JP')+'問'].filter(Boolean).join(' · ')));content.appendChild(scope);
    var stats=node('dl','mx-achievement-stats');
    function stat(label,value,unit){var cell=node('div');cell.appendChild(node('dt',null,label));var dd=node('dd',null,value.toLocaleString('ja-JP'));dd.appendChild(node('small',null,unit));cell.appendChild(dd);stats.appendChild(cell);}
    stat('解いた問題',m.solved,'問');if(m.correct!=null)stat('正解',m.correct,'問');else if(m.unique!=null)stat('取り組んだ問題の種類',count(m.unique),'問');content.appendChild(stats);
    if(m.note)content.appendChild(node('p','mx-achievement-note',m.note));
    var buttons=node('div','mx-achievement-actions');content.appendChild(buttons);
    function action(label,fn,cls){var b=node('button',cls,label);b.type='button';b.onclick=function(e){e.stopPropagation();close();if(fn)fn(e);};buttons.appendChild(b);}
    action(actions.primaryLabel||'ホームへ',actions.primary,'mx-achievement-primary');
    if(actions.secondary)action(actions.secondaryLabel||'もう一周',actions.secondary,'mx-achievement-secondary');
    if(actions.undo)action('↺ 1問戻る',actions.undo,'mx-achievement-undo');
    exit=actions.primary;dialog.addEventListener('cancel',function(e){e.preventDefault();var fn=exit;close();if(fn)fn();});
    doc.body.appendChild(dialog);doc.body.classList.add('mx-achievement-open');dialog.showModal();dialog.scrollTop=0;title.focus({preventScroll:true});
    return dialog;
  }
  doc.addEventListener('keydown',function(e){if(dialog&&dialog.open)e.stopPropagation();},true);
  root.MXAchievement={show:show,close:close,normalize:normalize,createTracker:createTracker};
})(typeof window!=='undefined'?window:globalThis);
