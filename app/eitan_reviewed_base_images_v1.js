/* Reviewed illustrations for corrected base-book examples. Exact-match only. */
(function(root){
'use strict';
var entries={"area":{"meaning":"地域、分野、面積","ex":["This *area* of research needs more funding.","この研究分野には、もっと資金が必要だ。"],"src":"word_img/reviewed-base-v1/area.webp"},"since":{"meaning":"〜して以来、〜だから","ex":["*Since* he moved here, he has cooked at home every day.","彼はここに引っ越して以来、毎日家で料理している。"],"src":"word_img/reviewed-base-v1/since.webp"},"separate":{"meaning":"分ける、離れた","ex":["A wall *separates* the kitchen from the dining room.","壁が台所と食堂を隔てている。"],"src":"word_img/reviewed-base-v1/separate.webp"},"used to":{"meaning":"以前はよく…した","ex":["He *used to* run marathons, but now he only watches them on TV.","彼は以前はよくマラソンを走ったが、今はテレビで見るだけだ。"],"src":"word_img/reviewed-base-v1/used_to.webp"},"domestic":{"meaning":"国内の、家庭の","ex":["A *domestic* flight is often cheaper than an international one.","国内線の便は、国際線より安いことが多い。"],"src":"word_img/reviewed-base-v1/domestic.webp"},"content":{"meaning":"内容、満足して、含有量、（contentsで）容器の中身","ex":["He is *content* with the box, although its *contents* are just one small screw.","中身は小さなねじ1本だけだが、彼はその箱に満足している。"],"src":"word_img/reviewed-base-v1/content.webp"},"threat":{"meaning":"脅威、恐れ","ex":["The *threat* of rain made everyone bring an umbrella.","雨が降る恐れがあったので、みんな傘を持ってきた。"],"src":"word_img/reviewed-base-v1/threat.webp"},"organize":{"meaning":"組織する、まとめる","ex":["He *organized* the team and *organized* the papers on his desk into twenty piles.","彼はチームを組織し、机の上の書類を20の山に整理した。"],"src":"word_img/reviewed-base-v1/organize.webp"},"must":{"meaning":"〜しなければならない、〜に違いない","ex":["You *must* wear a helmet when you ride a motorcycle.","バイクに乗るときは、ヘルメットを着用しなければならない。"],"src":"word_img/reviewed-base-v1/must.webp"},"comfort":{"meaning":"快適さ、慰め","ex":["The warmth of the room gave him *comfort* after the long journey.","長旅の後、その部屋の暖かさが彼に安らぎを与えた。"],"src":"word_img/reviewed-base-v1/comfort.webp"},"vice":{"meaning":"悪徳、悪習","ex":["His only *vice* is buying too many sweets from the vending machine.","彼の唯一の悪い癖は、自販機で菓子を買いすぎることだ。"],"src":"word_img/reviewed-base-v1/vice.webp"},"confine":{"meaning":"閉じ込める、制限する","ex":["They *confined* the dog to the kitchen while the guests were eating.","客が食事をしている間、彼らは犬を台所に閉じ込めておいた。"],"src":"word_img/reviewed-base-v1/confine.webp"},"compound":{"meaning":"化合物、複合的な、（問題を）悪化させる","ex":["Water is a chemical *compound* of hydrogen and oxygen.","水は水素と酸素の化合物だ。"],"src":"word_img/reviewed-base-v1/compound.webp"}};
var baseCards=new WeakSet();
function eligible(it){return it&&!it.user&&!it.drv&&it.kind!=='alt'&&!it.sokeiStoryId;}
function applyBook(book){
  if(!book)return;
  (book.deck||[]).forEach(function(it){
    baseCards.delete(it);
    if(book.id==='base'&&eligible(it))baseCards.add(it);
  });
}
function imageFor(it){
  if(!eligible(it)||!baseCards.has(it))return null;
  var entry=entries[it.w];
  if(!entry||it.m!==entry.meaning||JSON.stringify(it.ex)!==JSON.stringify(entry.ex))return null;
  return entry.src;
}
root.EitanReviewedBaseImages={entries:entries,applyBook:applyBook,imageFor:imageFor};
})(typeof window!=='undefined'?window:globalThis);
