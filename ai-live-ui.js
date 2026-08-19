(() => {
  async function callAI(payload){
    const sb=window.allshieldSupabase;
    const cfg=window.ALLSHIELD_CONFIG||{};
    if(!sb) throw new Error('Supabase is not connected.');
    const {data:sd,error:se}=await sb.auth.getSession();
    if(se) throw se;
    const token=sd?.session?.access_token;
    if(!token) throw new Error('Your session expired. Sign in again.');
    const res=await fetch(`${cfg.SUPABASE_URL}/functions/v1/ai-assistant`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':cfg.SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${token}`},
      body:JSON.stringify(payload)
    });
    const raw=await res.text();
    let data={};try{data=raw?JSON.parse(raw):{}}catch{data={error:raw}}
    if(!res.ok||data.error) throw new Error(data.error||`AI request failed (${res.status})`);
    return data;
  }

  function fieldValue(id){return document.getElementById(id)?.value?.trim()||''}
  function setBusy(btn,busy,label){if(!btn)return;if(busy){btn.dataset.oldText=btn.textContent;btn.disabled=true;btn.textContent=label||'AI working…'}else{btn.disabled=false;btn.textContent=btn.dataset.oldText||btn.textContent}}

  window.allshieldAIPolishField=async function(id,style='polished',button=null){
    const el=document.getElementById(id);if(!el)return;
    const source=el.value.trim();
    if(!source){toast('Write the post first so AI can work from your actual text.');el.focus();return;}
    try{
      setBusy(button,true,'AI working…');
      const out=await callAI({action:'rewrite_social',text:source,style});
      if(!out.text)throw new Error('AI returned an empty response.');
      el.value=out.text;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      if(out.engine==='contextual-fallback') toast('Post improved from your text. Live AI provider still needs its server key.');
      else toast('AI rewrite complete from your original text.');
    }catch(e){alert('AI error: '+(e.message||e));}
    finally{setBusy(button,false)}
  };

  window.aiRewrite=async function(style){
    const el=document.getElementById('socialCopy');if(!el)return;
    const source=el.value.trim();
    if(!source){toast('Write your post first. AI will rewrite what you actually wrote.');el.focus();return;}
    const buttons=[...document.querySelectorAll('.publish-toolbar button')];
    const btn=buttons.find(b=>b.getAttribute('onclick')?.includes(`aiRewrite('${style}')`));
    await window.allshieldAIPolishField('socialCopy',style,btn||null);
    if(typeof window.updateSocialPreview==='function')window.updateSocialPreview();
  };

  window.sendAI=async function(role){
    const input=document.getElementById('aiPrompt-'+role),chat=document.getElementById('aiChat-'+role);
    if(!input||!chat||!input.value.trim())return;
    const q=input.value.trim();input.value='';
    const mine=document.createElement('div');mine.className='ai-msg user';mine.textContent=q;chat.appendChild(mine);
    const wait=document.createElement('div');wait.className='ai-msg';wait.textContent='Working from your request…';chat.appendChild(wait);chat.scrollTop=chat.scrollHeight;
    try{
      const out=await callAI({action:'assist',prompt:q,role});
      wait.textContent=out.text||'No response returned.';
    }catch(e){wait.textContent='AI error: '+(e.message||e);}
    chat.scrollTop=chat.scrollHeight;
  };

  function patchComposerButtons(){
    for(const id of ['mktcopy','corpPost']){
      const el=document.getElementById(id);if(!el)continue;
      const card=el.closest('.bo-card,.social-card')||el.parentElement;
      for(const b of card?.querySelectorAll('button')||[]){
        if(/AI\s*(Polish|Rewrite)/i.test(b.textContent||'')){
          b.onclick=()=>window.allshieldAIPolishField(id,'polished',b);
        }
      }
    }
  }

  const oldOwner=window.showOwnerView;
  if(typeof oldOwner==='function')window.showOwnerView=function(view,el){oldOwner(view,el);setTimeout(patchComposerButtons,30)};
  const oldAdmin=window.showAdminView;
  if(typeof oldAdmin==='function')window.showAdminView=function(view,el){oldAdmin(view,el);setTimeout(patchComposerButtons,30)};
  setTimeout(patchComposerButtons,100);
})();
