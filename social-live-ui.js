(() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  async function user(){const sb=window.allshieldSupabase;if(!sb)return null;return (await sb.auth.getUser()).data.user}
  function destinations(){try{return [...selectedSocialChannels]}catch{return []}}
  async function connectedAccounts(){const sb=window.allshieldSupabase;if(!sb)return [];const {data,error}=await sb.from('social_accounts').select('id,platform,account_label,status,external_account_id').order('platform');if(error)throw error;return data||[]}

  window.saveSocialDraft=async function(){
    const sb=window.allshieldSupabase,u=await user(),copy=document.getElementById('socialCopy')?.value?.trim()||'';
    if(!sb||!u)return alert('Sign in again before saving.');if(!copy)return toast('Write the post before saving.');
    const {error}=await sb.from('social_posts').insert({created_by:u.id,body:copy,destinations:destinations(),status:'draft',media:[],platform_results:{}});
    if(error)return alert(error.message);toast('Draft saved to Allshield.');
  };

  window.loadSocialDraft=async function(){
    const sb=window.allshieldSupabase,u=await user(),el=document.getElementById('socialCopy');if(!sb||!u||!el)return;
    const {data,error}=await sb.from('social_posts').select('body,destinations,created_at').eq('created_by',u.id).eq('status','draft').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error){console.error(error);return}if(data?.body){el.value=data.body;if(typeof updateSocialPreview==='function')updateSocialPreview();}
    await window.refreshSocialAccountStatus();
  };

  window.publishSocialPost=async function(mode='publish'){
    const sb=window.allshieldSupabase,u=await user(),copy=document.getElementById('socialCopy')?.value?.trim()||'',result=document.getElementById('socialPublishResult');
    if(!sb||!u)return alert('Sign in again before publishing.');if(!copy)return toast('Add post copy before publishing.');
    const selected=destinations();if(!selected.length)return toast('Select at least one social channel.');
    try{
      const accounts=await connectedAccounts();
      const live=new Set(accounts.filter(a=>String(a.status).toLowerCase()==='connected').map(a=>String(a.platform).toLowerCase()));
      const unavailable=selected.filter(x=>!live.has(String(x).toLowerCase()));
      if(unavailable.length){
        const {error}=await sb.from('social_posts').insert({created_by:u.id,body:copy,destinations:selected,status:'draft',media:[],platform_results:{blocked_channels:unavailable}});if(error)throw error;
        if(result){result.textContent=`Saved as draft. Connect these company accounts before publishing: ${unavailable.join(', ')}.`;result.classList.add('show');}
        return toast('Post saved. Social account connection is required before publishing.');
      }
      if(mode==='schedule'){
        const when=prompt('Schedule date/time (example: 2026-08-20 09:00):');if(!when)return;
        const dt=new Date(when);if(Number.isNaN(dt.getTime()))return alert('Enter a valid date and time.');
        const {error}=await sb.from('social_posts').insert({created_by:u.id,body:copy,destinations:selected,status:'scheduled',scheduled_for:dt.toISOString(),media:[],platform_results:{}});if(error)throw error;
        if(result){result.textContent=`Scheduled in Allshield for ${dt.toLocaleString()}.`;result.classList.add('show');}return toast('Post scheduled in Allshield.');
      }
      const {error}=await sb.from('social_posts').insert({created_by:u.id,body:copy,destinations:selected,status:'queued',media:[],platform_results:{awaiting_platform_worker:true}});if(error)throw error;
      if(result){result.textContent='Queued in Allshield. The platform worker will publish only through connected company accounts.';result.classList.add('show');}
      toast('Post queued in Allshield.');
    }catch(e){alert(e.message||e)}
  };

  window.refreshSocialAccountStatus=async function(){
    try{
      const accounts=await connectedAccounts();
      const social=document.querySelector('#ownerMain .social-layout,#adminMain .social-layout');if(!social)return;
      const cards=[...social.querySelectorAll('.social-card')];const preview=cards[1];if(!preview)return;
      const heading=[...preview.querySelectorAll('h3')].find(h=>(h.textContent||'').includes('Connected Accounts'));if(!heading)return;
      let node=heading.nextElementSibling;while(node&&node.classList?.contains('account-row')){const next=node.nextElementSibling;node.remove();node=next;}
      const rows=accounts.length?accounts.map(a=>{const connected=String(a.status).toLowerCase()==='connected';return `<div class="account-row"><span><i class="statusdot ${connected?'':'off'}"></i>${esc(a.account_label||a.platform)}</span><span class="${connected?'pill':''}">${esc(a.status||'Not Connected')}</span><button class="tiny-btn" onclick="toast('Social account connection settings are managed by Owner credentials.')">Manage</button></div>`}).join(''):'<div class="activity" data-social-empty>No company social accounts are connected yet.</div>';
      heading.insertAdjacentHTML('afterend',rows);
    }catch(e){console.error('Unable to load social accounts',e)}
  };

  const oldOwner=window.showOwnerView;if(typeof oldOwner==='function')window.showOwnerView=function(view,el){oldOwner(view,el);if(view==='social')setTimeout(()=>{window.loadSocialDraft();window.refreshSocialAccountStatus()},40)};
  const oldAdmin=window.showAdminView;if(typeof oldAdmin==='function')window.showAdminView=function(view,el){oldAdmin(view,el);if(view==='social')setTimeout(()=>{window.loadSocialDraft();window.refreshSocialAccountStatus()},40)};
})();
