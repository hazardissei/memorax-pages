(function(root){
  'use strict';

  var ipa=root.IPA;
  if(!ipa||typeof ipa!=='object')return;

  // MX-N003: select the pronunciation that matches the taught meaning/POS.
  // The notation follows eitan_ipa_v1.js (acute accent marks primary stress).
  var corrected={
    lead:'líːd',       // v. 導く (not the metal /led/)
    wound:'wúːnd',     // n. 傷 (not the past of wind /waʊnd/)
    live:'lɪ́v',        // v. 住む・生きる (not adj. /laɪv/)
    record:'rékərd',   // n. 記録 (not v. /rɪˈkɔːrd/)
    object:'əbdʒékt',  // v. 反対する (not n. /ˈɑːbdʒekt/)
    conduct:'kəndʌ́kt', // v. 行う・伝える (not n. /ˈkɑːndʌkt/)
    close:'klóʊz',     // v. 閉める (not adj. /kloʊs/)
    invalid:'ɪnvǽlɪd', // adj. 無効な (not n. /ˈɪnvəlɪd/)
    use:'júːz',        // v. 使う (not n. /juːs/)
    tear:'tɪ́r'         // n. 涙 (not v. /ter/)
  };
  Object.keys(corrected).forEach(function(word){ipa[word]=corrected[word];});

  // A homophonic spelling gives standalone Web Speech enough information to
  // choose /waɪnd/ without speaking an extra disambiguating phrase.
  var tts=Object.assign({},root.EITAN_TTS_OVERRIDES||{});
  tts.wind='wined';
  root.EITAN_TTS_OVERRIDES=Object.freeze(tts);
})(typeof window!=='undefined'?window:globalThis);
