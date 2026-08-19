(() => {
  const cfg=window.ALLSHIELD_CONFIG||{};
  async function intake(payload){
    const res=await fetch(`${cfg.SUPABASE_URL}/functions/v1/public-intake`,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify(payload)});
    const raw=await res.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{data={error:raw}};if(!res.ok||data.error)throw new Error(data.error||`Request failed (${res.status})`);return data;
  }
  function fields(modal){return [...modal.querySelectorAll('input,select,textarea')]}
  window.submitLead=async function(){
    const modal=document.getElementById('leadModal');if(!modal)return;const f=fields(modal),btn=modal.querySelector('button.btn-primary');
    const [name,email,phone,coverage]=f;if(!name?.value.trim()||!email?.value.trim()){alert('Please enter your name and email.');return}
    try{if(btn){btn.disabled=true;btn.textContent='Submitting…'}await intake({action:'lead',full_name:name.value,email:email.value,phone:phone?.value||'',coverage_type:coverage?.value||'General',website:''});[name,email,phone].forEach(x=>{if(x)x.value=''});if(coverage)coverage.selectedIndex=0;closeLead();alert('Thank you. Your request has been received by Allshield.');}catch(e){alert(e.message||e)}finally{if(btn){btn.disabled=false;btn.textContent='Request Information'}}
  };
  window.submitCareer=async function(){
    const modal=document.getElementById('careerModal');if(!modal)return;const f=fields(modal),btn=modal.querySelector('button.btn-primary');const [name,email,status]=f;
    if(!name?.value.trim()||!email?.value.trim()){alert('Please enter your name and email.');return}
    try{if(btn){btn.disabled=true;btn.textContent='Submitting…'}await intake({action:'career',full_name:name.value,email:email.value,licensing_status:status?.value||'Not specified',website:''});[name,email].forEach(x=>{if(x)x.value=''});if(status)status.selectedIndex=0;closeCareer();alert('Thank you. Your career inquiry has been received by Allshield.');}catch(e){alert(e.message||e)}finally{if(btn){btn.disabled=false;btn.textContent='Request Career Information'}}
  };
  document.querySelectorAll('#leadModal p').forEach(p=>{if(/preview|test the interaction/i.test(p.textContent||''))p.textContent='Tell us what you need and an Allshield team member can follow up with you.'});
})();