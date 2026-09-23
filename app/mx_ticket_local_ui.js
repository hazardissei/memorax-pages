(function(root){
  'use strict';
  var localUI=null;
  // Display only; existing purchase and ticket authorities still control access.
  function bookStatus(s,options){
    options=options||{};s=s||{};
    if(options.platform==='web'||options.permanent)return null;
    if(!s.distributionClaimed&&!s.referralRewarded&&!s.remainingDays)return null;
    var active=s.auth==='signed_in'&&s.active===true&&Number.isInteger(s.remainingDays)&&s.remainingDays>0&&s.remainingDays<=60;
    return {active:active,label:active?'あと '+s.remainingDays+' 日分':(s.remainingDays>0?'日数を確認':'チケット終了')};
  }
  function mount(client){
    var overlay=document.createElement('div');overlay.className='mx-ticket-overlay mx-local-ticket';overlay.hidden=true;
    overlay.innerHTML='<section class="mx-ticket-panel" role="dialog" aria-modal="true" aria-labelledby="mxLocalTicketTitle">'+
      '<header class="mx-ticket-nav"><h2 id="mxLocalTicketTitle">チケット受け取り</h2><button type="button" class="mx-ticket-close" data-action="close" aria-label="とじる">×</button></header>'+
      '<h3 class="mx-ticket-title">英熟語チケットを<br>受け取ろう</h3>'+
      '<div class="mx-ticket-box" data-area="distribution"><h3>配布コードを使う</h3><p class="mx-ticket-note">配布された共通コードを入力します。無料・自動更新なし。コードごとに、1つの端末・1つのApple IDで1回だけ受け取れます。</p><input class="mx-ticket-input" data-input="code" aria-label="配布コード" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="コード" maxlength="64"><button type="button" class="mx-ticket-primary" data-action="redeem">コードを使う</button></div>'+
      '<div class="mx-ticket-msg" role="status" aria-live="polite"></div>'+
      '<details class="mx-ticket-rules"><summary>チケットのルール</summary><p>14日分、英熟語帳を利用できます。受け取った当日から対象です。日本時間0時に前日分を確認し、通常問題を100問未満しか解いていない日は1日分を消費します。アプリを開かなかった日も消費します。100問達成日は消費せず、日数も増えません。</p><p>正解・不正解は問いません。操作練習、カットイン、自分で追加した単語、取り消した回答は数えません。達成判定と日数管理はこの端末で行い、回答をサーバーへ送りません。</p><p>コードには受け取り期限があります。期限内に受け取った分は、期限を過ぎても残り日数のあいだ使えます。別のコードを受け取ると日数が加算されます。残り0日になるとチケットの利用は終了します。購入済みの利用権はそのままです。</p><p>受け取りの記録はこの端末とApple IDに残り、同じコードを二度は受け取れません。100問達成によって延びた分や回答数は、別端末には引き継がれません。学習リセットではチケットを消去しません。</p></details></section>';
    document.body.appendChild(overlay);var panel=overlay.querySelector('section'),busy=false,focus=null,overflow='';
    function q(s){return overlay.querySelector(s);}
    function note(s,error){var message=q('.mx-ticket-msg');message.textContent=s;message.classList.toggle('error',!!error);if(s&&!overlay.hidden)message.scrollIntoView({block:'nearest'});}
    function render(s){if(s.error)note(s.error,true);}
    function close(){overlay.hidden=true;document.body.style.overflow=overflow;if(focus&&document.contains(focus))focus.focus();}
    async function run(fn){if(busy)return;busy=true;panel.setAttribute('aria-busy','true');panel.querySelectorAll('button:not([data-action="close"])').forEach(function(b){b.disabled=true;});
      try{await fn();}catch(e){note(root.MXLocalTicket.message(e),true);}finally{busy=false;panel.removeAttribute('aria-busy');panel.querySelectorAll('button').forEach(function(b){b.disabled=false;});render(client.snapshot());}}
    async function redeem(){
      var input=q('[data-input="code"]'),code=input.value.normalize('NFKC').trim();
      if(!code){note('コードを入力してください。',true);input.focus();return;}
      if(/^MXR-/i.test(code)){note('紹介機能は終了しました。',true);return;}
      var r=await client.redeemCode(code);input.value='';
      note('チケットを受け取りました。'+r.days+'日分、英熟語帳を使えます。');
    }
    overlay.addEventListener('click',function(e){var b=e.target.closest('[data-action]');if(!b)return;var a=b.dataset.action;
      if(a==='close')return close();if(busy)return;
      if(a==='redeem')run(redeem);
    });
    overlay.addEventListener('keydown',function(e){e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}
      if(e.key==='Enter'&&e.target===q('[data-input="code"]')){e.preventDefault();if(!busy)run(redeem);}
      if(e.key==='Tab'){var nodes=Array.from(panel.querySelectorAll('button,input,summary')).filter(function(n){return !n.disabled&&n.getClientRects().length;});if(!nodes.length)return;var first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    client.subscribe(render);
    localUI={close:close,refresh:function(){render(client.snapshot());},open:function(options){
      options=options||{};if(overlay.hidden){focus=document.activeElement;overflow=document.body.style.overflow;}overlay.hidden=false;document.body.style.overflow='hidden';panel.scrollTop=0;
      var rules=!!options.rules;overlay.dataset.view=rules?'rules':'distribution';q('[data-area="distribution"]').hidden=rules;
      q('.mx-ticket-title').innerHTML=rules?'英熟語チケットの<br>ルール':'英熟語チケットを<br>受け取ろう';
      q('#mxLocalTicketTitle').textContent=rules?'チケットのルール':'チケット受け取り';q('details').open=rules;note('');render(client.snapshot());
      if(options.code){var input=q('[data-input="code"]');input.value=options.code;input.focus();input.scrollIntoView({block:'center'});}else q('[data-action="close"]').focus();
    }};
    return localUI;
  }
  root.MXTicketUI={mount:mount,bookStatus:bookStatus,openRules:function(){if(localUI)localUI.open({rules:true});}};
})(window);
