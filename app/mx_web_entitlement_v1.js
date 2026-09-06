(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MXWebEntitlement=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var SESSION_KEY='mxweb.eitan.auth.v1';
  var DEFAULT_KEY='memorax.eitan.idioms.web';

  function cleanBase(value){return String(value||'').replace(/\/+$/,'');}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
  function safeJson(text){try{return JSON.parse(text);}catch(_){return null;}}
  function nowSeconds(now){return Math.floor(now()/1000);}
  function messageFor(error){return error&&error.message?String(error.message):'権利を確認できませんでした';}

  function validSession(value){return !!(value&&typeof value==='object'&&typeof value.access_token==='string'&&value.access_token&&typeof value.refresh_token==='string'&&value.refresh_token);}
  function normalizeSession(value,now){
    if(!validSession(value))return null;
    return {
      access_token:value.access_token,
      refresh_token:value.refresh_token,
      expires_at:Number(value.expires_at)||(nowSeconds(now)+Number(value.expires_in||3600)),
      user:value.user&&typeof value.user==='object'?{id:String(value.user.id||''),email:String(value.user.email||'')}:null
    };
  }
  function safeUrl(value){
    try{var url=new URL(String(value));return url.protocol==='https:'||url.hostname==='127.0.0.1'||url.hostname==='localhost'?url:null;}catch(_){return null;}
  }

  function Client(config,deps){
    deps=deps||{};config=config||{};
    this.config={
      supabaseUrl:cleanBase(config.supabaseUrl),
      supabaseAnonKey:String(config.supabaseAnonKey||''),
      functionsUrl:cleanBase(config.functionsUrl||((config.supabaseUrl||'').replace(/\/+$/,'')+'/functions/v1')),
      entitlementKey:String(config.entitlementKey||DEFAULT_KEY)
    };
    this.fetch=deps.fetch||((typeof fetch==='function')?fetch.bind(globalThis):null);
    this.storage=deps.storage||((typeof localStorage!=='undefined')?localStorage:null);
    this.now=deps.now||Date.now;
    this.listeners=[];
    this.session=null;
    this.state={auth:'loading',entitlement:'unknown',granted:false,user:null,product:null,content:null,error:null};
  }

  Client.prototype.snapshot=function(){return clone(this.state);};
  Client.prototype.subscribe=function(listener){
    if(typeof listener!=='function')return function(){};
    this.listeners.push(listener);listener(this.snapshot());
    var self=this;return function(){self.listeners=self.listeners.filter(function(item){return item!==listener;});};
  };
  Client.prototype.emit=function(patch){
    for(var key in patch)this.state[key]=patch[key];
    var snap=this.snapshot();this.listeners.slice().forEach(function(listener){try{listener(snap);}catch(_){}});
    return snap;
  };
  Client.prototype.configured=function(){
    return !!(this.fetch&&this.config.supabaseUrl&&this.config.supabaseAnonKey&&this.config.functionsUrl&&this.config.entitlementKey===DEFAULT_KEY);
  };
  Client.prototype.readSession=function(){
    if(!this.storage)return null;
    try{return normalizeSession(safeJson(this.storage.getItem(SESSION_KEY)||''),this.now);}catch(_){return null;}
  };
  Client.prototype.writeSession=function(session){
    this.session=normalizeSession(session,this.now);
    try{if(this.storage){if(this.session)this.storage.setItem(SESSION_KEY,JSON.stringify(this.session));else this.storage.removeItem(SESSION_KEY);}}catch(_){}
    return this.session;
  };
  Client.prototype.headers=function(token){
    return {'apikey':this.config.supabaseAnonKey,'Authorization':'Bearer '+token,'Content-Type':'application/json'};
  };
  Client.prototype.requestJson=async function(url,options){
    var response=await this.fetch(url,options||{}),payload=safeJson(await response.text());
    if(!response.ok){var error=new Error((payload&&(payload.error_description||payload.error||payload.message))||('HTTP '+response.status));error.status=response.status;throw error;}
    return payload||{};
  };
  Client.prototype.authRequest=function(path,body,token){
    return this.requestJson(this.config.supabaseUrl+'/auth/v1/'+path,{method:'POST',headers:this.headers(token||this.config.supabaseAnonKey),body:body?JSON.stringify(body):undefined});
  };
  Client.prototype.refresh=async function(){
    if(!this.session||!this.session.refresh_token)throw new Error('ログインが必要です');
    try{
      var session=await this.authRequest('token?grant_type=refresh_token',{refresh_token:this.session.refresh_token});
      this.writeSession(session);return this.session;
    }catch(error){this.writeSession(null);this.emit({auth:'signed_out',entitlement:'unknown',granted:false,user:null,product:null,content:null,error:null});throw error;}
  };
  Client.prototype.ensureToken=async function(){
    if(!this.session)throw new Error('ログインが必要です');
    if(Number(this.session.expires_at)<=nowSeconds(this.now)+30)await this.refresh();
    return this.session.access_token;
  };
  Client.prototype.functionRequest=async function(path,options,retry){
    options=options||{};var token=await this.ensureToken();
    var req={method:options.method||'GET',headers:this.headers(token)};
    if(options.body!==undefined)req.body=JSON.stringify(options.body);
    try{return await this.requestJson(this.config.functionsUrl+'/'+path,req);}
    catch(error){if(error.status===401&&retry!==false&&this.session&&this.session.refresh_token){await this.refresh();return this.functionRequest(path,options,false);}throw error;}
  };
  Client.prototype.boot=async function(){
    if(!this.configured()){this.emit({auth:'config_missing',entitlement:'unknown',granted:false,user:null,product:null,content:null,error:null});return this.snapshot();}
    this.session=this.readSession();
    if(!this.session){this.emit({auth:'signed_out',entitlement:'unknown',granted:false,user:null,product:null,content:null,error:null});return this.snapshot();}
    this.emit({auth:'signed_in',user:this.session.user,error:null});
    await this.sync();return this.snapshot();
  };
  Client.prototype.signIn=async function(email,password){
    email=String(email||'').trim();password=String(password||'');
    if(!email||!password)throw new Error('メールアドレスとパスワードを入力してください');
    this.emit({auth:'loading',entitlement:'unknown',granted:false,content:null,error:null});
    try{
      var session=await this.authRequest('token?grant_type=password',{email:email,password:password});
      this.writeSession(session);this.emit({auth:'signed_in',user:this.session.user,error:null});await this.sync();return this.snapshot();
    }catch(error){this.writeSession(null);this.emit({auth:'signed_out',entitlement:'unknown',granted:false,user:null,product:null,content:null,error:messageFor(error)});throw error;}
  };
  Client.prototype.signUp=async function(email,password){
    email=String(email||'').trim();password=String(password||'');
    if(!email||password.length<8)throw new Error('メールアドレスと8文字以上のパスワードを入力してください');
    var signupBody={email:email,password:password};
    this.emit({auth:'loading',entitlement:'unknown',granted:false,content:null,error:null});
    try{
      var result=await this.authRequest('signup',signupBody);
      if(validSession(result)){this.writeSession(result);this.emit({auth:'signed_in',user:this.session.user,error:null});await this.sync();}
      else{this.writeSession(null);this.emit({auth:'signed_out',entitlement:'unknown',granted:false,user:null,product:null,content:null,error:'確認メールを開いて登録を完了し、その後ログインしてください'});}
      return this.snapshot();
    }catch(error){this.writeSession(null);this.emit({auth:'signed_out',entitlement:'unknown',granted:false,user:null,product:null,content:null,error:messageFor(error)});throw error;}
  };
  Client.prototype.signOut=async function(){
    var token=this.session&&this.session.access_token;
    this.writeSession(null);this.emit({auth:'signed_out',entitlement:'unknown',granted:false,user:null,product:null,content:null,error:null});
    if(token)try{await this.authRequest('logout',null,token);}catch(_){}
    return this.snapshot();
  };
  Client.prototype.sync=async function(){
    if(!this.session){this.emit({auth:'signed_out',entitlement:'unknown',granted:false,user:null,product:null,content:null,error:null});return this.snapshot();}
    this.emit({auth:'signed_in',entitlement:'loading',granted:false,content:null,error:null,user:this.session.user});
    try{
      var payload=await this.functionRequest('eitan-entitlement');
      var entitlement=payload&&payload.entitlement;
      var granted=!!(entitlement&&entitlement.key===this.config.entitlementKey&&entitlement.granted===true&&entitlement.status==='active');
      this.emit({entitlement:granted?'active':'inactive',granted:granted,product:payload&&payload.product||null,error:null});
      if(granted)await this.loadContent();
      return this.snapshot();
    }catch(error){this.emit({entitlement:'error',granted:false,product:null,content:null,error:messageFor(error)});return this.snapshot();}
  };
  Client.prototype.loadContent=async function(){
    if(!this.state.granted)throw new Error('英熟語の利用権が必要です');
    var payload=await this.functionRequest('eitan-content');
    if(!payload||payload.entitlementKey!==this.config.entitlementKey||!payload.idioms||!Array.isArray(payload.idioms.words)||!payload.examples)throw new Error('英熟語データの形式が不正です');
    this.emit({content:{version:String(payload.version||''),idioms:payload.idioms,examples:payload.examples},error:null});
    return this.state.content;
  };
  Client.prototype.createCheckout=async function(){
    if(!this.session)throw new Error('購入するにはログインしてください');
    var key=(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():String(this.now())+'-'+Math.random().toString(36).slice(2);
    var payload=await this.functionRequest('eitan-checkout',{method:'POST',body:{entitlementKey:this.config.entitlementKey,idempotencyKey:key}});
    var url=safeUrl(payload&&payload.url);if(!url)throw new Error('購入ページを開けませんでした');return url.href;
  };
  Client.prototype.createPortal=async function(){
    if(!this.session)throw new Error('ログインしてください');
    var payload=await this.functionRequest('eitan-portal',{method:'POST',body:{entitlementKey:this.config.entitlementKey}});
    var url=safeUrl(payload&&payload.url);if(!url)throw new Error('購入管理ページを開けませんでした');return url.href;
  };
  function socialUnavailable(){return Promise.reject(new Error('この機能は現在利用できません'));}
  Client.prototype.referralStatus=socialUnavailable;
  Client.prototype.redeemCode=function(code){code=String(code||'').trim().toUpperCase();if(!/^MXI-[A-Z0-9]{16}$/.test(code))return Promise.reject(new Error('コードの形式を確認してください'));return this.functionRequest('eitan-redeem',{method:'POST',body:{code:code}});};
  Client.prototype.updateSocialProfile=socialUnavailable;
  Client.prototype.syncActivity=socialUnavailable;

  return {create:function(config,deps){return new Client(config,deps);},Client:Client,SESSION_KEY:SESSION_KEY,ENTITLEMENT_KEY:DEFAULT_KEY};
});
