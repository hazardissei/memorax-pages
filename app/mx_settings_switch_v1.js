(function(root){
  'use strict';
  // A view of the app's existing setting. This component never stores values.
  function render(box, options){
    if(!box)return null;
    var button=box.querySelector('.mx-settings-switch');
    if(!button){
      var doc=box.ownerDocument;
      box.textContent='';
      button=doc.createElement('button');
      button.type='button';
      button.className='mx-settings-switch';
      button.setAttribute('role','switch');
      var track=doc.createElement('span');
      track.className='mx-switch-track';
      track.setAttribute('aria-hidden','true');
      var thumb=doc.createElement('span');
      thumb.className='mx-switch-thumb';
      track.appendChild(thumb);
      var status=doc.createElement('span');
      status.className='mx-switch-status';
      status.setAttribute('aria-hidden','true');
      button.appendChild(track);button.appendChild(status);box.appendChild(button);
      button.addEventListener('click',function(){
        var current=button._mxOptions;
        if(button.disabled||!current||typeof current.onChange!=='function')return;
        current.onChange(!current.checked);
      });
    }
    button._mxOptions=options;
    button.setAttribute('aria-label',options.label);
    button.setAttribute('aria-checked',options.checked?'true':'false');
    button.disabled=!!options.disabled;
    button.querySelector('.mx-switch-status').textContent=options.checked?'オン':'オフ';
    box.classList.add('mx-switch-host');
    return button;
  }
  root.MXSettingsSwitch=Object.freeze({render:render});
})(typeof window!=='undefined'?window:globalThis);
