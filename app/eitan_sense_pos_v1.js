(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.EitanSensePOS=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var FULL={名:'名詞',動:'動詞',他:'他動詞',自:'自動詞',形:'形容詞',副:'副詞',前:'前置詞',接:'接続詞',代:'代名詞',助:'助動詞',間:'間投詞',冠:'冠詞'};
  var POS_LABELS=['名詞','動詞','他動詞','自動詞','形容詞','副詞','前置詞','接続詞','代名詞','助動詞','間投詞','冠詞','熟語','固有名詞'];
  var EXACT={
    'present\u0000出席している':'形容詞',
    'end\u0000端':'名詞','end\u0000終わり':'名詞',
    'hard\u0000硬い':'形容詞','hard\u0000熱心に':'副詞',
    'overnight\u0000一晩':'副詞','upright\u0000直立した':'形容詞',
    'faint\u0000かすかな':'形容詞','face-to-face\u0000対面の':'形容詞'
  };
  function parts(raw){
    raw=String(raw||'').trim();if(!raw)return [];
    var out=[];
    raw.split('・').forEach(function(p){
      if(p==='自他'){out.push('自動詞','他動詞');return;}
      if(FULL[p])out.push(FULL[p]);else if(POS_LABELS.indexOf(p)>=0)out.push(p);else if(p)out.push(p);
    });
    return out.filter(function(p,i,a){return a.indexOf(p)===i;});
  }
  function exactGrammar(word,meaning,grammar){
    var spec=grammar&&grammar.words&&grammar.words[String(word||'').toLowerCase()],labels=spec&&spec[meaning];
    if(!Array.isArray(labels))return '';
    return labels.find(function(label){return POS_LABELS.indexOf(label)>=0;})||'';
  }
  function guess(text){
    var s=String(text||'').replace(/[（(][^）)]*[）)]/g,'').trim();
    if(/(?:的な|らしい|っぽい|[\u4e00-\u9fff]{1,}な)$/.test(s)||/(?:安い|高い|低い|良い|悪い|強い|弱い|軽い|重い|明るい|暗い|若い|古い|新しい|速い|遅い|近い|遠い|難しい|易しい|等しい|激しい|著しい|乏しい|望ましい|ふさわしい|おいしい|正しい|忙しい|厳しい|広い|狭い|深い|浅い|長い|短い)$/.test(s))return '形容詞';
    if(/(?:的に|として|一晩で?|面と向かって|直立して|同様に|熱心に|急に|徐々に|完全に)$/.test(s))return '副詞';
    if(/[〜～](?:を|に|へ|から)/.test(s)||/(?:を|に)[^、]*?(?:する|させる|与える|置く|開ける|閉じる|変える|増やす|減らす|広げる|溶かす|燃やす|倒す|壊す|移す|上げる|下げる|伝える|支える|率いる|送る|保つ|含む|表す|示す|求める|選ぶ|使う|扱う|作る|得る|見る|聞く|読む|書く|取る|持つ|呼ぶ|防ぐ|促す|認める|受ける|行う)$/.test(s))return '他動詞';
    if(/(?:になる|となる|がる|まる|れる|生じる|起こる|存在する|ある|いる|戻る|上がる|下がる|増える|減る|変わる|広がる|伸びる|縮む|溶ける|凍る|燃える|沈む|進む|続く|向かう|働く|着く|慣れる|適応する|反対する|成功する|失敗する|発生する|消える|現れる|集まる|分かれる|立つ|座る|落ちる|残る)$/.test(s))return '自動詞';
    if(/(?:する|させる|化する|める|える|す|う|く|ぐ|つ|ぬ|ぶ|む|る)$/.test(s))return '動詞';
    return '名詞';
  }
  function choose(text,candidates,allowOutside){
    var g=guess(text);
    if(candidates.indexOf(g)>=0)return g;
    if(g==='動詞'){
      if(candidates.indexOf('他動詞')>=0&&candidates.indexOf('自動詞')>=0)return '動詞';
      if(candidates.indexOf('他動詞')>=0)return '他動詞';
      if(candidates.indexOf('自動詞')>=0)return '自動詞';
    }
    if(allowOutside&&g!=='動詞')return g;
    return candidates.length===1?candidates[0]:candidates.join('・');
  }
  function resolve(word,senses,posMap,grammar){
    senses=Array.isArray(senses)?senses:[];
    var user=word&&Array.isArray(word.senses)?word.senses:null;
    var raw=(posMap||{})[String(word&&word.w||'').toLowerCase()]||(word&&word.pos)||'',candidates=parts(raw);
    var labels=senses.map(function(meaning,index){
      var userLabel=user&&user[index]&&String(user[index].p||'').trim();
      if(userLabel)return userLabel;
      var reviewed=word&&word.examPOS&&word.examPOS[index];if(reviewed)return reviewed;
      var override=EXACT[String(word&&word.w||'').toLowerCase()+'\u0000'+String(meaning||'').trim()];if(override)return override;
      var exact=exactGrammar(word&&word.w,meaning,grammar);if(exact)return exact;
      if(!candidates.length){
        if(/\s/.test(String(word&&word.w||'').trim()))return '熟語';
        if(/^[A-Z]/.test(String(word&&word.w||'')))return '固有名詞';
        return guess(meaning);
      }
      var hard=word&&word.hi!=null&&index>=Number(word.hi);
      return choose(meaning,candidates,hard);
    });
    var common=labels.length&&labels.every(function(label){return label===labels[0];})?labels[0]:'';
    return {common:common,rows:labels,complete:labels.every(Boolean)};
  }
  function audit(records,posMap,grammar){
    var missing=[],mixed=[],empty=[];
    (records||[]).forEach(function(word){var senses=Array.isArray(word.ms)?word.ms:[];if(!senses.length||senses.some(function(s){return !String(s||'').trim();}))empty.push(word.w);var model=resolve(word,senses,posMap,grammar);if(!model.complete)missing.push(word.w);if(!model.common&&new Set(model.rows).size>1)mixed.push(word.w);});
    return {records:(records||[]).length,emptyMeanings:empty,missingPOS:missing,mixedPOS:mixed};
  }
  return {parts:parts,guess:guess,resolve:resolve,audit:audit};
});
