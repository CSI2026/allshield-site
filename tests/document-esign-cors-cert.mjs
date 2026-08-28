const BASE=(process.env.ALLSHIELD_LIVE_URL||'https://allshieldinsurancegroup.com').replace(/\/$/,'');
const FUNCTION_URL='https://xxeiddnfbdqxwuojuggy.supabase.co/functions/v1/document-esign';
const checks=[];
const rec=(name,ok,detail='')=>checks.push({name,ok,detail});
const required=['authorization','x-client-info','apikey','content-type','x-retry-count','traceparent','tracestate','baggage'];
try{
  const preflight=await fetch(FUNCTION_URL,{
    method:'OPTIONS',
    headers:{
      Origin:BASE,
      'Access-Control-Request-Method':'POST',
      'Access-Control-Request-Headers':required.join(', ')
    },
    cache:'no-store'
  });
  const allowHeaders=(preflight.headers.get('access-control-allow-headers')||'').toLowerCase();
  const allowMethods=(preflight.headers.get('access-control-allow-methods')||'').toUpperCase();
  const allowOrigin=preflight.headers.get('access-control-allow-origin')||'';
  const allowed=new Set(allowHeaders.split(',').map(x=>x.trim()).filter(Boolean));
  rec('document-esign CORS preflight responds successfully',preflight.ok,`HTTP ${preflight.status}`);
  rec('document-esign permits ALLSHIELD browser origin',allowOrigin==='*'||allowOrigin===BASE,`allow-origin=${allowOrigin||'missing'}`);
  for(const h of required)rec(`document-esign permits ${h}`,allowed.has(h),`allow-headers=${allowHeaders||'missing'}`);
  rec('document-esign permits POST',allowMethods.includes('POST'),`allow-methods=${allowMethods||'missing'}`);
  rec('document-esign permits OPTIONS',allowMethods.includes('OPTIONS'),`allow-methods=${allowMethods||'missing'}`);

  const unauth=await fetch(FUNCTION_URL,{
    method:'POST',
    headers:{Origin:BASE,'Content-Type':'application/json','x-client-info':'allshield-esign-cert'},
    body:JSON.stringify({action:'staff_context'}),
    cache:'no-store'
  });
  const postOrigin=unauth.headers.get('access-control-allow-origin')||'';
  rec('document-esign POST endpoint is reachable',unauth.status===401||unauth.status===403,`HTTP ${unauth.status}`);
  rec('document-esign error responses retain CORS',postOrigin==='*'||postOrigin===BASE,`allow-origin=${postOrigin||'missing'}`);
}catch(e){rec('CORS certification execution',false,e?.stack||e?.message||String(e));}
const failures=checks.filter(x=>!x.ok);
console.log(JSON.stringify({certification:'ALLSHIELD document-esign Browser CORS',base_url:BASE,function_url:FUNCTION_URL,completed_at:new Date().toISOString(),status:failures.length?'FAIL':'PASS',passed:checks.length-failures.length,total:checks.length,checks,failures:failures.map(x=>`${x.name}: ${x.detail}`)},null,2));
process.exitCode=failures.length?1:0;
