(function(root,factory){
  'use strict';
  var api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MXLocalTicket=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';
  /* 英熟語チケット（配布コード方式・2026-09-20）
     - Apple の商品・サーバーは使わない。同梱した SHA-256（mx_dist_codes_v1.js）と照合して付与する。
     - キャンペーンごとに1回。使用済みは端末内・Keychain・iCloud KV（deps.marks）に記録する。
     - 日数のルール（受取日から消費・100問達成日は消費しない・複数キャンペーンは加算）は Apple 方式のときと同じ。 */
  var DAY=86400000, PREFIX='mx2_code_ticket_local_v1:', OWNER='device', ACTIVE=PREFIX+'owner';
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function day(ms){return Math.floor((ms+9*3600000)/DAY);}
  function dateKey(d){return new Date(d*DAY).toISOString().slice(0,10);}
  function empty(now){return {version:2,lastNow:now,grants:{},protectedDays:{},counts:{}};}
  function record(v){return v&&typeof v==='object'&&!Array.isArray(v);}
  function validGrant(t){return record(t)&&t.source==='code'&&typeof t.campaign==='string'&&t.campaign.length>0&&Number.isInteger(t.days)&&t.days>0&&t.days<=60&&Number.isFinite(t.purchasedAt)&&t.purchasedAt>0&&typeof t.revoked==='boolean';}
  function validData(v){return record(v)&&v.version===2&&Number.isFinite(v.lastNow)&&record(v.grants)&&record(v.protectedDays)&&record(v.counts)
    &&Object.values(v.grants).every(validGrant)&&Object.entries(v.protectedDays).every(function(e){return /^\d+$/.test(e[0])&&e[1]===true;})
    &&Object.entries(v.counts).every(function(e){return /^\d+$/.test(e[0])&&record(e[1])&&Number.isInteger(e[1].total)&&e[1].total>=0&&record(e[1].attempts);});}
  // One grant per campaign. Consume the combined balance once per unprotected
  // calendar day, including the redemption day, never before it.
  function balance(data,today){
    var seen={},grants=Object.values(data.grants).filter(function(g){return !g.revoked;}).sort(function(a,b){return a.purchasedAt-b.purchasedAt;});
    grants=grants.filter(function(g){if(seen[g.campaign])return false;seen[g.campaign]=true;return true;});
    var days=0,at=null,protectedDays=Object.keys(data.protectedDays).map(Number);
    function consume(end){if(at===null)return;var n=end-at;protectedDays.forEach(function(d){if(d>=at&&d<end)n--;});days=Math.max(0,days-Math.max(0,n));at=end;}
    grants.forEach(function(g){var start=day(g.purchasedAt);if(start>today)return;consume(start);at=start;days+=g.days;});
    consume(today);return days;
  }
  /* ---- コードの正規化と SHA-256（WebCrypto に頼らず同期で動く。Node のテストで crypto と照合する） ---- */
  function normalizeCode(code){return String(code||'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g,'');}
  var K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function sha256(text){
    var bytes=[],s=unescape(encodeURIComponent(String(text)));for(var i=0;i<s.length;i++)bytes.push(s.charCodeAt(i)&255);
    var bitLen=bytes.length*8;bytes.push(0x80);while(bytes.length%64!==56)bytes.push(0);
    for(var p=7;p>=0;p--)bytes.push(p>=4?0:(bitLen/Math.pow(2,p*8))&255);
    var H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],W=new Array(64);
    function rotr(x,n){return (x>>>n)|(x<<(32-n));}
    for(var off=0;off<bytes.length;off+=64){
      for(var t=0;t<16;t++)W[t]=((bytes[off+t*4]<<24)|(bytes[off+t*4+1]<<16)|(bytes[off+t*4+2]<<8)|bytes[off+t*4+3])>>>0;
      for(t=16;t<64;t++){var s0=rotr(W[t-15],7)^rotr(W[t-15],18)^(W[t-15]>>>3),s1=rotr(W[t-2],17)^rotr(W[t-2],19)^(W[t-2]>>>10);W[t]=(W[t-16]+s0+W[t-7]+s1)>>>0;}
      var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for(t=0;t<64;t++){var S1=rotr(e,6)^rotr(e,11)^rotr(e,25),ch=(e&f)^(~e&g),t1=(h+S1+ch+K[t]+W[t])>>>0,S0=rotr(a,2)^rotr(a,13)^rotr(a,22),maj=(a&b)^(a&c)^(b&c),t2=(S0+maj)>>>0;
        h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
      H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0;
    }
    return H.map(function(x){return ('00000000'+x.toString(16)).slice(-8);}).join('');
  }
  function hashCode(code){var n=normalizeCode(code);return n?sha256(n):'';}
  function campaignExpiry(c){return Date.parse(String(c.expires)+'T14:59:59.999Z');}/* 日本時間その日いっぱい */
  function validCampaign(c){return record(c)&&typeof c.id==='string'&&c.id.length>0&&typeof c.hash==='string'&&/^[0-9a-f]{64}$/.test(c.hash)&&Number.isFinite(campaignExpiry(c))&&Number.isInteger(c.days)&&c.days>0&&c.days<=60;}
  function message(e){return ({
    code_invalid:'このコードは使えません。入力内容を確認してください。',
    code_expired:'このコードの受け取り期限は終了しました。',
    code_used:'このコードはこの端末またはApple IDで受け取り済みです。',
    ios_required:'コードはiPhone版のアプリで使えます。',
    storage_unavailable:'チケットの記録を保存できません。端末の空き容量を確認してください。'
  })[e&&e.message]||'コードを確認できませんでした。時間をおいてお試しください。';}
  function Client(config,deps){
    deps=deps||{};this.config=config||{};this.storage=deps.storage||root.localStorage;this.marks=deps.marks||null;
    this.campaigns=Array.isArray(deps.campaigns)?deps.campaigns:(deps.campaigns&&Array.isArray(deps.campaigns.campaigns)?deps.campaigns.campaigns:(root.MX_DIST_CODES&&Array.isArray(root.MX_DIST_CODES.campaigns)?root.MX_DIST_CODES.campaigns:[]));
    this.now=deps.now||Date.now;this.goal=100;this.queue=[];
    this.listeners=[];this.sessionUser=null;this.data=empty(this.now());this.error=null;this.inflight=null;
    if(this.configured())this.attach(OWNER);
  }
  Client.prototype.configured=function(){return this.config.enabled===true&&this.config.mode==='local-code';};
  Client.prototype.attach=function(owner){
    if(owner===this.sessionUser)return;
    var stored=null;try{stored=JSON.parse(this.storage.getItem(PREFIX+owner)||'null');}catch(_){}
    this.data=validData(stored)?stored:empty(this.now());
    this.sessionUser=owner;try{this.storage.setItem(ACTIVE,owner);}catch(_){}
  };
  Client.prototype.serverTime=function(){return Math.max(this.now(),this.data.lastNow||0);};
  Client.prototype.snapshot=function(){
    var today=day(this.serverTime()),count=this.data.counts[today],remaining=this.configured()&&this.sessionUser?balance(this.data,today):0;
    var grants=Object.values(this.data.grants).filter(function(g){return !g.revoked;}),ids=grants.map(function(g){return g.campaign;});
    return {auth:this.configured()&&this.sessionUser?'signed_in':'config_missing',local:true,active:remaining>0,remainingDays:remaining,
      dailyAnswers:count?count.total:0,dailyGoal:100,day:dateKey(today),pending:0,error:this.error,
      codeGrants:ids,distributionClaimed:ids.length>0,referralRewarded:false,offers:[]};
  };
  Client.prototype.emit=function(){var s=this.snapshot();this.listeners.forEach(function(f){try{f(s);}catch(_){}});return s;};
  Client.prototype.subscribe=function(fn){this.listeners.push(fn);fn(this.snapshot());var self=this;return function(){self.listeners=self.listeners.filter(function(f){return f!==fn;});};};
  Client.prototype.change=function(fn){
    var before=copy(this.data);try{fn(this.data);this.data.lastNow=this.serverTime();var today=day(this.data.lastNow);
      Object.keys(this.data.counts).forEach(function(d){if(Number(d)<today-1)delete this.data.counts[d];},this);
      this.storage.setItem(PREFIX+this.sessionUser,JSON.stringify(this.data));this.error=null;
    }catch(_){this.data=before;this.error=message(Error('storage_unavailable'));this.emit();throw Error('storage_unavailable');}
    return this.emit();
  };
  Client.prototype.answer=function(attempt,question,eligible){
    if(!eligible||!attempt||!this.configured()||!this.sessionUser)return null;
    var d=day(this.serverTime()),receipt={day:d,attempt:String(attempt),owner:this.sessionUser};
    var c=this.data.counts[d];if(c&&Object.prototype.hasOwnProperty.call(c.attempts,receipt.attempt))return null;
    try{this.change(function(data){var c=data.counts[d]||(data.counts[d]={total:0,attempts:{}});c.attempts[receipt.attempt]=true;c.total++;
      if(c.total>=100)data.protectedDays[d]=true;
      // Only recent attempts can still be undone by the learning UI.
      Object.keys(c.attempts).slice(0,-2048).forEach(function(k){delete c.attempts[k];});
    });return receipt;}catch(_){return null;}
  };
  Client.prototype.undo=function(receipt){
    if(!receipt||receipt.owner!==this.sessionUser)return;
    var c=this.data.counts[receipt.day];if(!c||c.attempts[receipt.attempt]!==true)return;
    try{this.change(function(data){var c=data.counts[receipt.day];c.attempts[receipt.attempt]=false;c.total=Math.max(0,c.total-1);if(c.total<100)delete data.protectedDays[receipt.day];});}catch(_){}
  };
  Client.prototype.findCampaign=function(code){
    var h=hashCode(code);if(!h)return null;
    for(var i=0;i<this.campaigns.length;i++){var c=this.campaigns[i];if(validCampaign(c)&&c.hash===h)return c;}
    return null;
  };
  /* 使用済みの記録：端末内（grants）＋ marks（Keychain・iCloud KV）。読めない時は端末内だけで判断する。 */
  Client.prototype.usedElsewhere=async function(id){
    if(!this.marks||typeof this.marks.get!=='function')return false;
    try{var used=await this.marks.get();return !!(used&&used[id]);}catch(_){return false;}
  };
  Client.prototype.markUsed=async function(id){
    if(!this.marks||typeof this.marks.set!=='function')return;
    try{await this.marks.set(id);}catch(_){}
  };
  Client.prototype.redeemCode=async function(code){
    if(!this.configured()||!this.sessionUser)throw Error('ios_required');
    if(this.inflight)await this.inflight.catch(function(){});
    var self=this;this.inflight=(async function(){
      var c=self.findCampaign(code);if(!c)throw Error('code_invalid');
      if(self.serverTime()>campaignExpiry(c))throw Error('code_expired');
      if(self.data.grants[c.id]&&!self.data.grants[c.id].revoked)throw Error('code_used');
      if(await self.usedElsewhere(c.id))throw Error('code_used');
      var at=self.serverTime();
      self.change(function(data){data.grants[c.id]={source:'code',campaign:c.id,days:c.days,purchasedAt:at,revoked:false};});
      await self.markUsed(c.id);
      return {ok:true,campaign:c.id,days:c.days,snapshot:self.snapshot()};
    })();
    try{return await this.inflight;}finally{this.inflight=null;}
  };
  Client.prototype.refresh=function(){if(this.sessionUser)try{this.change(function(){});}catch(_){}return Promise.resolve(this.emit());};
  Client.prototype.boot=Client.prototype.refresh;
  Client.prototype.background=function(){if(this.sessionUser)try{this.change(function(){});}catch(_){}return Promise.resolve(this.snapshot());};
  Client.prototype.hasAccess=function(){return this.snapshot().active;};
  return {create:function(c,d){return new Client(c,d);},Client:Client,balance:balance,day:day,empty:empty,message:message,PREFIX:PREFIX,ACTIVE:ACTIVE,OWNER:OWNER,
    normalizeCode:normalizeCode,sha256:sha256,hashCode:hashCode,campaignExpiry:campaignExpiry,validCampaign:validCampaign};
});
