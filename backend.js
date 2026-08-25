(() => {
  const cfg = window.ALLSHIELD_CONFIG || {};
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_URL.includes('YOUR_PROJECT') && !cfg.SUPABASE_PUBLISHABLE_KEY.includes('YOUR_SUPABASE'));
  const FETCH_TIMEOUT_MS = 12000;

  function setBackendStatus(text, live=false, error=false){
    document.querySelectorAll('[data-backend-status]').forEach(el=>{
      el.textContent=text;
      el.classList.toggle('live',!!live);
      if(error) el.setAttribute('data-error','1'); else el.removeAttribute('data-error');
    });
    window.dispatchEvent(new CustomEvent('allshield:backend-status',{detail:{text,live,error}}));
  }

  function timeoutFetch(input, init={}){
    const controller=new AbortController();
    const outer=init.signal;
    const timer=setTimeout(()=>controller.abort(new DOMException('Allshield backend request timed out','AbortError')),FETCH_TIMEOUT_MS);
    if(outer){
      if(outer.aborted) controller.abort(outer.reason);
      else outer.addEventListener('abort',()=>controller.abort(outer.reason),{once:true});
    }
    return fetch(input,{...init,signal:controller.signal}).finally(()=>clearTimeout(timer));
  }

  let sb=null;
  let readyResolve;
  window.allshieldBackendReady=new Promise(r=>readyResolve=r);

  try{
    if(!configured) throw new Error('Supabase configuration is missing.');
    if(!window.supabase?.createClient) throw new Error('Supabase client library did not load.');
    sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{
      global:{fetch:timeoutFetch},
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
    });
    window.allshieldSupabase=sb;
    setBackendStatus('Supabase client ready',true,false);
    readyResolve(sb);
  }catch(e){
    window.allshieldSupabase=null;
    window.allshieldBackendBootError=e;
    setBackendStatus('Backend unavailable',false,true);
    readyResolve(null);
    console.error('ALLSHIELD BACKEND BOOT',e);
  }

  async function withTimeout(promise,ms=15000,label='Backend request'){
    let t;
    try{return await Promise.race([promise,new Promise((_,rej)=>t=setTimeout(()=>rej(new Error(label+' timed out.')),ms))]);}
    finally{clearTimeout(t)}
  }
  window.allshieldWithTimeout=withTimeout;

  async function healthCheck(){
    if(!sb)return false;
    try{
      const {error}=await withTimeout(sb.from('profiles').select('id').limit(1),10000,'Supabase health check');
      if(error) throw error;
      window.allshieldBackendOnline=true;
      setBackendStatus('Supabase connected',true,false);
      return true;
    }catch(e){
      window.allshieldBackendOnline=false;
      setBackendStatus('Supabase connection problem',false,true);
      console.error('ALLSHIELD BACKEND HEALTH',e);
      return false;
    }
  }
  window.allshieldBackendHealthCheck=healthCheck;
  if(sb) setTimeout(healthCheck,0);

  async function getProfile(userId) {
    if (!sb) return null;
    const { data, error } = await withTimeout(sb.from('profiles').select('id,email,first_name,last_name,role,status,resident_state,department_id,manager_id').eq('id', userId).single(),15000,'Profile load');
    if (error) throw error;
    return data;
  }

  async function productionLogin(requestedRole) {
    if (!sb) { alert('Allshield backend is not connected. Refresh after the connection indicator becomes ready.'); return; }
    const card=document.getElementById(requestedRole+'Login');
    const loginValue=card?.querySelector('input[type="text"],input:not([type])')?.value?.trim() || card?.querySelector('input[placeholder*="username" i]')?.value?.trim() || card?.querySelector('input[placeholder*="email" i]')?.value?.trim();
    const password=card?.querySelector('input[type="password"]')?.value||'';
    if(!loginValue||!password){alert('Enter your username and password.');return;}
    let email=loginValue;
    if(!loginValue.includes('@')){
      const username=loginValue.trim().toLowerCase();
      if(!/^[a-z0-9._-]{3,40}$/.test(username)){alert('Username not recognized.');return;}
      email=`${username}@${cfg.INTERNAL_EMAIL_DOMAIN||'allshield.internal'}`;
    }
    try{
      const {data,error}=await withTimeout(sb.auth.signInWithPassword({email,password}),15000,'Sign in');
      if(error)throw error;
      const profile=await getProfile(data.user.id);
      const role=profile?.role||'agent';
      const allowed={agent:['agent','team_lead','manager','admin','owner'],admin:['admin','owner'],owner:['owner']};
      if(!allowed[requestedRole].includes(role)){await sb.auth.signOut();alert('Your account does not have permission to enter this portal.');return;}
      window.currentAllshieldProfile=profile;
      window.enterPortal(requestedRole);
      if(requestedRole==='agent')await loadAgentDashboard(data.user.id);
      else if(requestedRole==='admin')await loadAdminDashboard();
      else await loadOwnerDashboard();
    }catch(err){alert(err?.message||'Unable to sign in to Allshield.');console.error(err);}
  }
  window.productionLogin=productionLogin;

  async function loadAgentDashboard(userId){
    if(!sb)return;
    try{
      const [onboarding,licenses,scores,production]=await withTimeout(Promise.all([
        sb.from('onboarding_progress').select('*').eq('user_id',userId).order('step_order'),
        sb.from('user_state_licenses').select('*').eq('user_id',userId),
        sb.from('exam_attempts').select('score_percent,created_at,exam_type,state_code').eq('user_id',userId).order('created_at',{ascending:false}).limit(10),
        sb.from('production_entries').select('period_start,period_end,sales_count,quality_score').eq('user_id',userId).order('period_start',{ascending:false}).limit(12)
      ]),15000,'Agent dashboard');
      window.allshieldData={onboarding:onboarding.data||[],licenses:licenses.data||[],scores:scores.data||[],production:production.data||[]};
    }catch(e){console.error('Agent dashboard load failed',e);window.allshieldData={onboarding:[],licenses:[],scores:[],production:[]};}
  }
  async function loadAdminDashboard(){
    if(!sb)return;
    const {data,error}=await withTimeout(sb.from('profiles').select('id,first_name,last_name,role,status,resident_state,manager_id').order('last_name'),15000,'Admin dashboard');
    if(error)throw error; window.allshieldAdminData=data||[];
  }
  async function loadOwnerDashboard(){return loadAdminDashboard();}

  window.allshieldSaveOnboardingStep=async function(stepKey,completed,metadata={}){if(!sb)return false;const user=(await withTimeout(sb.auth.getUser(),10000,'Session check')).data.user;if(!user)return false;const {error}=await withTimeout(sb.from('onboarding_progress').upsert({user_id:user.id,step_key:stepKey,completed,completed_at:completed?new Date().toISOString():null,metadata},{onConflict:'user_id,step_key'}),15000,'Onboarding save');if(error)throw error;return true;};
  window.allshieldSaveTargetStates=async function(states){if(!sb)return false;const user=(await withTimeout(sb.auth.getUser(),10000,'Session check')).data.user;if(!user)return false;const rows=states.map(code=>({user_id:user.id,state_code:code,license_type:'life_health',status:'studying',is_resident:false}));const {error}=await withTimeout(sb.from('user_state_licenses').upsert(rows,{onConflict:'user_id,state_code,license_type'}),15000,'License state save');if(error)throw error;return true;};
  window.allshieldSaveExamAttempt=async function(payload){if(!sb)return false;const user=(await withTimeout(sb.auth.getUser(),10000,'Session check')).data.user;if(!user)return false;const {error}=await withTimeout(sb.from('exam_attempts').insert({user_id:user.id,exam_type:payload.examType||'practice',state_code:payload.stateCode||null,score_percent:payload.scorePercent,question_count:payload.questionCount,correct_count:payload.correctCount,attempt_payload:payload.attemptPayload||{}}),15000,'Exam save');if(error)throw error;return true;};
  window.allshieldSignOut=async()=>{if(sb)try{await withTimeout(sb.auth.signOut(),10000,'Sign out')}catch(_){};window.returnHome();};

  if(sb) sb.auth.onAuthStateChange((_event,session)=>{window.allshieldSession=session;});

  window.allshieldListTeamUsers=async()=>{if(!sb)return[];const {data,error}=await withTimeout(sb.from('profiles').select('id,username,first_name,last_name,email,role,status,resident_state,department_id,manager_id,created_at,departments(name)').order('created_at',{ascending:false}),15000,'Team users');if(error)throw error;return data||[];};
  window.allshieldListDepartments=async()=>{if(!sb)return[];const {data,error}=await withTimeout(sb.from('departments').select('id,name,slug').order('name'),15000,'Departments');if(error)throw error;return data||[];};
  window.allshieldManageTeamUser=async payload=>{if(!sb)throw new Error('Supabase is not connected.');const {data,error}=await withTimeout(sb.functions.invoke('manage-team-user',{body:payload}),20000,'Team account action');if(error)throw error;if(data?.error)throw new Error(data.error);return data;};
})();
