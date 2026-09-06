(function(root){
  'use strict';
  var eitan=root.EITAN;if(!eitan||!Array.isArray(eitan.books))return;
  function stableId(bookId,faculty,word){return 'sx1:'+bookId+':'+encodeURIComponent(String(faculty||''))+':'+encodeURIComponent(String(word||'').toLowerCase());}
  ['waseda','keio'].forEach(function(bookId){
    var book=eitan.books.find(function(item){return item.id===bookId;});if(!book)return;
    (book.words||[]).forEach(function(item){if(!item.id)item.id=stableId(bookId,item.g,item.w);});
  });
  var additions=[{
    id:'sx1:waseda:%E5%95%86:opportunity',bookId:'waseda',w:'opportunity',m:['機会'],g:'商',cnt:1,fc:1,
    cntLabel:'公式公開資料 2025年 1回確認',countBasis:'verified_minimum',
    sourceEvidence:{institution:'早稲田大学',year:2025,faculty:'商学部',document:'英語 入試問題訂正（問題冊子5ページ II 設問3.1(d)）',url:'https://www.waseda.jp/inst/admission/assets/uploads/2025/06/16_2025_ippan_eigo.pdf',observedForm:'opportunities'}
  }];
  additions.forEach(function(add){var book=eitan.books.find(function(item){return item.id===add.bookId;});if(!book)return;var exists=(book.words||[]).some(function(item){return item.id===add.id||(item.g===add.g&&String(item.w).toLowerCase()===add.w);});if(!exists)book.words.push({id:add.id,w:add.w,m:add.m,g:add.g,cnt:add.cnt,fc:add.fc,cntLabel:add.cntLabel,countBasis:add.countBasis,sourceEvidence:add.sourceEvidence});});
  root.EITAN_SOUKEI_PATCH={version:1,stableIdPrefix:'sx1:',stableIdAppliedToExisting:true,additions:additions,coverageComplete:false};
})(typeof window!=='undefined'?window:globalThis);
