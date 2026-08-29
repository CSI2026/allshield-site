from pathlib import Path

p=Path('supabase/functions/social-connection-admin/index.ts')
s=p.read_text()

def rep(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s=s.replace(old,new,1)

rep("const BUILD='B2026.08.29.044';","const BUILD='B2026.08.29.045';",'build')
rep("linkedin:{label:'LinkedIn',platforms:['linkedin'],credential_names:['LINKEDIN_CLIENT_ID','LINKEDIN_CLIENT_SECRET'],fields:[['LINKEDIN_CLIENT_ID','LinkedIn Client ID','text'],['LINKEDIN_CLIENT_SECRET','LinkedIn Client Secret','password']],oauth:true,guide:['Create/select a LinkedIn developer app connected to the Allshield organization page.','Enable Sign In with LinkedIn using OpenID Connect.','Request the organization social products/permissions needed for Page publishing and community management.','Add the callback URL shown here.','Save credentials and connect. A member-only connection is not considered Maya-ready.']},",
    "linkedin:{label:'LinkedIn',platforms:['linkedin'],credential_names:['LINKEDIN_CLIENT_ID','LINKEDIN_CLIENT_SECRET'],fields:[['LINKEDIN_CLIENT_ID','LinkedIn Client ID','text'],['LINKEDIN_CLIENT_SECRET','LinkedIn Client Secret','password']],oauth:true,guide:['Create/select a LinkedIn developer app associated with the Allshield organization page.','Enable Sign In with LinkedIn using OpenID Connect and apply for Community Management API access.','Request r_organization_admin, r_organization_social, w_organization_social, r_organization_social_feed and w_organization_social_feed.','Add the callback URL shown here.','Save credentials and connect. Allshield must identify and verify the actual Company Page; a member-only login never counts as Maya-ready.']},",'linkedin guide')
rep("youtube:{label:'YouTube',platforms:['youtube'],credential_names:['YOUTUBE_CLIENT_ID','YOUTUBE_CLIENT_SECRET'],fields:[['YOUTUBE_CLIENT_ID','Google OAuth Client ID','text'],['YOUTUBE_CLIENT_SECRET','Google OAuth Client Secret','password']],oauth:true,guide:['Create/select a Google Cloud OAuth web application.','Enable YouTube Data API v3.','Add the callback URL shown here as an authorized redirect URI.','Configure the OAuth consent screen and verification as required.','Save credentials and connect the Allshield YouTube channel.']},",
    "youtube:{label:'YouTube',platforms:['youtube'],credential_names:['YOUTUBE_CLIENT_ID','YOUTUBE_CLIENT_SECRET'],fields:[['YOUTUBE_CLIENT_ID','Google OAuth Client ID','text'],['YOUTUBE_CLIENT_SECRET','Google OAuth Client Secret','password']],oauth:true,guide:['Create/select a Google Cloud OAuth web application.','Enable YouTube Data API v3 and YouTube Analytics API.','Add the callback URL shown here as an authorized redirect URI.','Configure the OAuth consent screen/verification and request youtube.upload, youtube.readonly, youtube.force-ssl and yt-analytics.readonly.','Save credentials and connect the official Allshield YouTube channel.']},",'youtube guide')

anchor="\n\nasync function capability"
pos=s.find(anchor)
if pos<0: raise SystemExit('missing helper insertion point')
helpers="""

function linkedinHeaders(token:string){return {Authorization:`Bearer ${token}`,'X-Restli-Protocol-Version':'2.0.0','Linkedin-Version':Deno.env.get('LINKEDIN_VERSION')||'202607','Content-Type':'application/json'}}
async function linkedinOrganizations(token:string){
 const q='https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED&count=100&projection=(elements*(*,organization~(localizedName,vanityName)))';
 const r=await fetch(q,{headers:linkedinHeaders(token)});const j=await r.json();if(!r.ok)throw new Error(j?.message||`Unable to read LinkedIn Company Pages (${r.status})`);
 const out:any[]=[];for(const e of j.elements||[]){const urn=String(e.organization||e.organizationTarget||'');if(!urn.startsWith('urn:li:organization:'))continue;const id=urn.split(':').pop()||'';const name=e['organization~']?.localizedName||e['organization~']?.vanityName||urn;if(!out.some(x=>x.id===id))out.push({id,urn,name,role:e.role||null})}return out
}
async function linkedinConnectOrg(userId:string,orgId:string,token:any,scopes:string[]){
 const id=String(orgId).replace(/^urn:li:organization:/,'');if(!/^\\d+$/.test(id))throw new Error('Invalid LinkedIn organization id');
 const r=await fetch(`https://api.linkedin.com/rest/organizations/${id}`,{headers:linkedinHeaders(token.access_token)});const org=await r.json();if(!r.ok)throw new Error(org?.message||`LinkedIn organization verification failed (${r.status})`);
 const name=org.localizedName||org.name?.localized?.[Object.keys(org.name?.localized||{})[0]]||`LinkedIn Organization ${id}`;
 await connected('linkedin',userId,{...token,scope:scopes.join(' ')},`urn:li:organization:${id}`,name,{provider:'linkedin',organization_id:id,vanity_name:org.vanityName||null,organization_verified:true});return org
}
"""
s=s[:pos]+helpers+s[pos:]

rep("else if(platform==='linkedin'){const r=await fetch('https://api.linkedin.com/v2/userinfo',{headers:{Authorization:`Bearer ${t.access_token}`}});api=await r.json();identity_ok=r.ok&&Boolean(api.sub)}",
    "else if(platform==='linkedin'){const orgId=String(c.metadata?.organization_id||c.external_account_id||'').replace(/^urn:li:organization:/,'');if(/^\\d+$/.test(orgId)){const r=await fetch(`https://api.linkedin.com/rest/organizations/${orgId}`,{headers:linkedinHeaders(t.access_token)});api=await r.json();identity_ok=r.ok&&String(api.id||'')===orgId;extra.organization_verified=identity_ok;extra.organization_status=r.status}else{identity_ok=false;extra.identity_error='LinkedIn Company Page is not selected/verified'}}",'linkedin verify')
rep("else if(platform==='youtube'){const r=await fetch('https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',{headers:{Authorization:`Bearer ${t.access_token}`}});api=await r.json();const ch=api?.items?.[0];identity_ok=r.ok&&Boolean(ch?.id)&&(!c.external_account_id||String(ch.id)===String(c.external_account_id))}",
    "else if(platform==='youtube'){const r=await fetch('https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',{headers:{Authorization:`Bearer ${t.access_token}`}});api=await r.json();const ch=api?.items?.[0];identity_ok=r.ok&&Boolean(ch?.id)&&(!c.external_account_id||String(ch.id)===String(c.external_account_id));if(identity_ok&&granted.includes('https://www.googleapis.com/auth/yt-analytics.readonly')){const endDate=new Date().toISOString().slice(0,10);const sd=new Date(Date.now()-7*86400000).toISOString().slice(0,10);const q=new URLSearchParams({ids:'channel==MINE',startDate:sd,endDate,metrics:'views'});const ar=await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${q.toString()}`,{headers:{Authorization:`Bearer ${t.access_token}`}});extra.analytics_status=ar.status;extra.analytics_ok=ar.ok}}",'youtube verify')
rep("const engagement_ok=!cap.engagement_metrics_supported||(cap.required_publish_scopes||[]).concat(cap.required_comment_scopes||[]).some((s:string)=>granted.includes(s));",
    "let engagement_ok=!cap.engagement_metrics_supported||(cap.required_publish_scopes||[]).concat(cap.required_comment_scopes||[]).some((s:string)=>granted.includes(s));if(platform==='youtube'&&cap.engagement_metrics_supported)engagement_ok=extra.analytics_ok===true;",'engagement probe')
old="else if(provider==='linkedin'){const tr=await fetch('https://www.linkedin.com/oauth/v2/accessToken',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:c.get('LINKEDIN_CLIENT_ID')!,client_secret:c.get('LINKEDIN_CLIENT_SECRET')!,redirect_uri:redirect})});const t=await tr.json();if(!tr.ok)throw new Error(t?.error_description||t?.error||'LinkedIn token exchange failed');const ir=await fetch('https://api.linkedin.com/v2/userinfo',{headers:{Authorization:`Bearer ${t.access_token}`}});const me=await ir.json();if(!ir.ok)throw new Error(me?.message||'Unable to read LinkedIn profile');await connected('linkedin',st.user_id,t,me.sub||null,me.name||'LinkedIn',{provider:'linkedin'})}"
new="else if(provider==='linkedin'){const tr=await fetch('https://www.linkedin.com/oauth/v2/accessToken',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:c.get('LINKEDIN_CLIENT_ID')!,client_secret:c.get('LINKEDIN_CLIENT_SECRET')!,redirect_uri:redirect})});const t=await tr.json();if(!tr.ok)throw new Error(t?.error_description||t?.error||'LinkedIn token exchange failed');const scopes=csv(t.scope||'openid profile r_organization_admin r_organization_social w_organization_social r_organization_social_feed w_organization_social_feed');await storeToken('linkedin_user',st.user_id,{...t,scope:scopes.join(' ')},null,{provider:'linkedin'});const orgs=await linkedinOrganizations(t.access_token);if(orgs.length===1)await linkedinConnectOrg(st.user_id,orgs[0].id,t,scopes);else if(orgs.length>1)await setConn('linkedin',{status:'needs_selection',connected_by:st.user_id,error_message:null,scopes,metadata:{provider:'linkedin',organization_choices:orgs}});else await setConn('linkedin',{status:'error',connected_by:st.user_id,error_message:'No approved LinkedIn Company Page role was found for this member.',scopes,metadata:{provider:'linkedin'}})}"
rep(old,new,'linkedin callback')
rep("if(p==='linkedin'){const q=new URLSearchParams({response_type:'code',client_id:c.get('LINKEDIN_CLIENT_ID')!,redirect_uri:callback(p),state,scope:'openid profile w_member_social w_organization_social r_organization_social_feed w_organization_social_feed'});return json({ok:true,authorization_url:`https://www.linkedin.com/oauth/v2/authorization?${q.toString()}`})}",
    "if(p==='linkedin'){const q=new URLSearchParams({response_type:'code',client_id:c.get('LINKEDIN_CLIENT_ID')!,redirect_uri:callback(p),state,scope:'openid profile r_organization_admin r_organization_social w_organization_social r_organization_social_feed w_organization_social_feed'});return json({ok:true,authorization_url:`https://www.linkedin.com/oauth/v2/authorization?${q.toString()}`})}",'linkedin scopes')
rep("if(p==='youtube'){const scope='https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl';",
    "if(p==='youtube'){const scope='https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly';",'youtube scopes')
marker=" if(action==='verify'){"
insert=" if(action==='select_linkedin_org'){const orgId=String(b.organization_id||'');const lc=await connection('linkedin');const userId=lc.connected_by||a.id;const tr=await db.from('social_oauth_tokens').select('*').eq('platform','linkedin_user').eq('user_id',userId).maybeSingle();if(!tr.data?.access_token)return json({error:'LinkedIn authorization must be completed first'},409);const scopes=csv(tr.data.scopes);await linkedinConnectOrg(userId,orgId,tr.data,scopes);return json({ok:true})}\n"
if marker not in s: raise SystemExit('missing linkedin selection insertion point')
s=s.replace(marker,insert+marker,1)
p.write_text(s)

ui=Path('social-connection-center.js');u=ui.read_text()
if "const VERSION='B2026.08.29.044';" not in u: raise SystemExit('missing UI build marker')
u=u.replace("const VERSION='B2026.08.29.044';","const VERSION='B2026.08.29.045';",1)
old="let select='';if(c.status==='needs_selection'&&p==='facebook'&&Array.isArray(c.metadata?.page_choices)){select=`<div class=\"scc-field\"><label>Choose the Allshield Facebook Page</label><select id=\"sccMetaPage\" class=\"mini-input\">${c.metadata.page_choices.map(x=>`<option value=\"${attr(x.id)}\">${esc(x.name)}${x.instagram_username?' • @'+esc(x.instagram_username):''}</option>`).join('')}</select><div class=\"scc-actions\"><button class=\"tiny-btn\" onclick=\"allshieldSCCSelectMetaPage()\">Use This Page</button></div></div>`}"
if old not in u: raise SystemExit('missing UI selection target')
new=old+"else if(c.status==='needs_selection'&&p==='linkedin'&&Array.isArray(c.metadata?.organization_choices)){select=`<div class=\"scc-field\"><label>Choose the Allshield LinkedIn Company Page</label><select id=\"sccLinkedInOrg\" class=\"mini-input\">${c.metadata.organization_choices.map(x=>`<option value=\"${attr(x.id)}\">${esc(x.name)}</option>`).join('')}</select><div class=\"scc-actions\"><button class=\"tiny-btn\" onclick=\"allshieldSCCSelectLinkedInOrg()\">Use This Company Page</button></div></div>`}"
u=u.replace(old,new,1)
anchor="window.allshieldSCCSelectMetaPage=async()=>"
i=u.find(anchor)
if i<0: raise SystemExit('missing meta UI action anchor')
end=u.find(";\n",i)
if end<0: raise SystemExit('missing meta UI action end')
end+=2
u=u[:end]+"window.allshieldSCCSelectLinkedInOrg=async()=>{try{const organization_id=document.getElementById('sccLinkedInOrg')?.value;if(!organization_id)throw new Error('Choose a LinkedIn Company Page first.');await edge({action:'select_linkedin_org',organization_id});ASSIST='LinkedIn Company Page selected. Run Verify for LinkedIn.';await load()}catch(e){alert(e.message||e)}};\n"+u[end:]
ui.write_text(u)

idx=Path('index.html');x=idx.read_text();x=x.replace('social-connection-center.js?v=B2026.08.29.044','social-connection-center.js?v=B2026.08.29.045');idx.write_text(x)
bi=Path('build-info.js');b=bi.read_text();b=b.replace("current_build:'B2026.08.29.044'","current_build:'B2026.08.29.045'").replace("label:'Production B044 — Secure Social Connection Center + Professional Verification — Certified'","label:'B045 Candidate — Professional Social Provider Verification'");bi.write_text(b)
