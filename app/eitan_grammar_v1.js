(function(root){
  'use strict';

  // MX-N018 seed data. Labels are attached to an exact Japanese sense instead
  // of the spelling as a whole, so mixed C/U and transitive/intransitive uses
  // are never collapsed into a single binary flag.
  root.EITAN_GRAMMAR={
    version:2,
    words:{
      advice:{'助言':['不可算 U']},
      information:{'情報':['不可算 U']},
      furniture:{'家具':['不可算 U']},
      equipment:{'装備':['不可算 U']},
      luggage:{'荷物':['不可算 U']},
      baggage:{'手荷物':['不可算 U']},
      progress:{'進歩':['不可算 U']},
      knowledge:{'知識':['不可算 U']},
      research:{'(学術)研究':['不可算 U']},
      experience:{'経験':['可算 C','不可算 U']},
      paper:{'新聞':['可算 C'],'論文':['可算 C']},
      room:{'部屋':['可算 C'],'余地':['不可算 U']},
      light:{'光':['可算 C','不可算 U'],'明るい':['形容詞'],'軽い':['形容詞']},
      record:{'記録':['可算 C']},
      work:{'働く':['自動詞'],'仕事':['不可算 U'],'うまくいく':['自動詞']},
      change:{'変える':['他動詞'],'変わる':['自動詞'],'交換する':['他動詞'],'変化':['可算 C','不可算 U'],'つり銭':['不可算 U']},
      sound:{'音':['可算 C','不可算 U'],'〜に聞こえる':['自動詞'],'健全な':['形容詞']},
      issue:{'問題':['可算 C'],'(雑誌の)号':['可算 C'],'(切手など)を発行する':['他動詞']},
      demand:{'〜を(強く)要求する':['他動詞'],'要求':['可算 C','不可算 U']},
      import:{'輸入する':['他動詞'],'輸入':['可算 C','不可算 U']},
      desert:{'砂漠':['可算 C'],'見捨てる':['他動詞']},
      object:{'(object toで)反対する':['自動詞'],'物':['可算 C'],'目的':['可算 C']},
      conduct:{'行う':['他動詞'],'伝える':['他動詞']},
      adjust:{'調整する':['他動詞'],'(adjust toで)慣れる':['自動詞'],'適応する':['自動詞']},
      meet:{'満たす':['他動詞'],'会う':['他動詞']},
      custom:{'習慣':['可算 C'],'(複数形 customs で)税関':['複数形'],'関税':['複数形']},
      medium:{'媒体':['可算 C'],'中くらいの':['形容詞']},
      convention:{'慣習':['可算 C','不可算 U'],'大会':['可算 C']},
      beat:{'打ち負かす':['他動詞']},
      establish:{'設立する':['他動詞']},
      'go through':{'一通り調べる':['他動詞'],'目を通す':['他動詞']},
      consistent:{'一貫した':['形容詞']},
      encouraging:{'励みになる':['形容詞']},
      deliberate:{'故意の':['形容詞'],'慎重な':['形容詞']},
      traffic:{'交通':['不可算 U']},
      weather:{'天気':['不可算 U']},
      money:{'お金':['不可算 U']},
      evidence:{'証拠':['不可算 U']},
      approach:{'取り組み方':['可算 C']},
      discuss:{'話し合う':['他動詞']},
      resemble:{'似ている':['他動詞']},
      enter:{'入る':['他動詞']},
      attend:{'出席する':['他動詞']},
      reach:{'着く':['他動詞']},
      arise:{'起こる':['自動詞']},
      occur:{'生じる':['自動詞']},
      exist:{'存在する':['自動詞']},
      consist:{'(consist ofで)構成されている':['自動詞'],'ある':['自動詞']}
    },
    // The UI reads only `words`. Source records keep each added label auditable
    // against the exact sense instead of turning a word-wide guess into data.
    sources:{
      traffic:{sense:'交通',url:'https://dictionary.cambridge.org/dictionary/english/traffic',checked:'2026-09-06'},
      weather:{sense:'天気',url:'https://dictionary.cambridge.org/dictionary/english/weather',checked:'2026-09-06'},
      money:{sense:'お金',url:'https://dictionary.cambridge.org/dictionary/english/money',checked:'2026-09-06'},
      evidence:{sense:'証拠',url:'https://dictionary.cambridge.org/dictionary/english/evidence',checked:'2026-09-06'},
      approach:{sense:'取り組み方',url:'https://dictionary.cambridge.org/dictionary/english/approach',checked:'2026-09-06'},
      discuss:{sense:'話し合う',url:'https://dictionary.cambridge.org/dictionary/english/discuss',checked:'2026-09-06'},
      resemble:{sense:'似ている',url:'https://dictionary.cambridge.org/dictionary/english/resemble',checked:'2026-09-06'},
      enter:{sense:'入る',url:'https://dictionary.cambridge.org/dictionary/english/enter',checked:'2026-09-06'},
      attend:{sense:'出席する',url:'https://dictionary.cambridge.org/dictionary/english/attend',checked:'2026-09-06'},
      reach:{sense:'着く',url:'https://dictionary.cambridge.org/dictionary/english/reach',checked:'2026-09-06'},
      arise:{sense:'起こる',url:'https://dictionary.cambridge.org/dictionary/english/arise',checked:'2026-09-06'},
      occur:{sense:'生じる',url:'https://dictionary.cambridge.org/dictionary/english/occur',checked:'2026-09-06'},
      exist:{sense:'存在する',url:'https://dictionary.cambridge.org/dictionary/english/exist',checked:'2026-09-06'},
      consist:{sense:'(consist ofで)構成されている',url:'https://dictionary.cambridge.org/dictionary/english/consist-of',checked:'2026-09-06'}
    },
    coverageComplete:false
  };
})(typeof window!=='undefined'?window:globalThis);
