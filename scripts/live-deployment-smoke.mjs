const BASE='https://allshieldinsurancegroup.com';
const checks=[];
const fail=[];
const rec=(name,ok,detail)=>{checks.push({name,ok,detail});if(!ok)fail.push(`${name}: ${detail}`)};
async function text(path){const r=await fetch(`${BASE}${path}?smoke=${Date.now()}`,{redirect:'follow'});if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return {body:await r.text(),url:r.url,status:r.status}}
try{
  const home=await text('/');
  rec('HTTPS homepage',home.status===200,`${home.status} ${home.url}`);
  rec('Allshield homepage identity',/Allshield Insurance Group/i.test(home.body),'expected company title/content present');
  rec('Live-only static shell',/LIVE DATA ONLY/i.test(home.body) && !/Jordan Miles|Ashley Reed|Marcus Hill|Taylor Brooks|Enter Demo|GOOD EVENING, CALVIN/i.test(home.body),'production shell present and samples absent');
  const app=await text('/app.js');
  rec('Production app shell deployed',app.body.includes('__allshieldProductionShellReady'),'production shell marker present');
  rec('Demo app source removed',!/Jordan Miles|Ashley Reed|Marcus Hill|Enter Demo|Interactive demo/i.test(app.body),'legacy markers absent');
  const runtime=await text('/production-runtime.js');
  rec('Production runtime deployed',runtime.body.includes('__allshieldProductionRuntimeReady'),'runtime marker present');
  const cfg=await text('/config.js');
  rec('Demo fallback disabled',/DEMO_FALLBACK:\s*false/.test(cfg.body),'config explicitly disables demo fallback');
}catch(e){rec('Deployment request',false,e?.stack||e?.message||String(e))}
const result={certification:'ALLSHIELD live deployment smoke',base_url:BASE,completed_at:new Date().toISOString(),status:fail.length?'FAIL':'PASS',passed:checks.filter(x=>x.ok).length,total:checks.length,checks,failures:fail};
console.log(JSON.stringify(result,null,2));
process.exitCode=fail.length?1:0;
