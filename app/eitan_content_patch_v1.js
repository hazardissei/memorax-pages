(function(root){
  'use strict';

  var data=root.EITAN;
  if(!data||!Array.isArray(data.books))return;

  function eachWord(target,apply){
    var found=0;
    data.books.forEach(function(book){
      (book.words||[]).forEach(function(item){
        if(item.w===target){apply(item);found++;}
        (item.d||[]).forEach(function(derived){
          if(derived.w===target){apply(derived);found++;}
        });
      });
    });
    if(found!==1&&root.console&&typeof root.console.warn==='function'){
      root.console.warn('[MemoraX content patch] unexpected record count',target,found);
    }
  }

  function meaning(word,values){
    eachWord(word,function(item){item.m=values.slice();});
  }
  function hardMeaning(word,value){
    eachWord(word,function(item){item.h=value;});
  }
  function removeHardMeaning(word){
    eachWord(word,function(item){delete item.h;});
  }

  // MX-N001: confirmed content inconsistencies reported in MX-R002/R003/R009/
  // R017/R018/R019/R026/R027/R029/R033/R036. POS and IPA are unchanged.
  removeHardMeaning('convention');
  meaning('beat',['打ち負かす']);
  meaning('consistent',['一貫した']);
  meaning('encouraging',['励みになる']);
  meaning('go through',['一通り調べる','目を通す']);
  hardMeaning('medium','中くらいの');
  hardMeaning('custom','(複数形 customs で)税関、関税');
  hardMeaning('meet','会う');
  removeHardMeaning('deliberate');
  meaning('establish',['設立する']);
  meaning('adjust',['調整する']);
  hardMeaning('adjust','(adjust toで)慣れる、適応する');

  if(root.WEXA&&Array.isArray(root.WEXA.establish)){
    root.WEXA.establish[1]='その学校は1901年に設立された';
  }
  if(root.WEXF&&Array.isArray(root.WEXF['go through'])){
    root.WEXF['go through'][1]='彼は日本語の1ページを探すため、説明書全体に目を通した';
  }
})(typeof window!=='undefined'?window:globalThis);
