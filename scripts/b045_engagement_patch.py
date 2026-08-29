from pathlib import Path
p=Path('supabase/functions/social-connection-admin/index.ts')
s=p.read_text()

def rep(old,new,label,all=False):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s=s.replace(old,new,-1 if all else 1)

rep("return r.data||{platform,organic_publish_supported:false,engagement_metrics_supported:false,comment_read_supported:false,comment_reply_supported:false,required_publish_scopes:[],required_comment_scopes:[]}",
    "return r.data||{platform,organic_publish_supported:false,engagement_metrics_supported:false,comment_read_supported:false,comment_reply_supported:false,required_publish_scopes:[],required_engagement_scopes:[],required_comment_scopes:[]}",'cap fallback')
rep("function scopeResult(cap:any,granted:string[]){const req=uniq([...(cap.required_publish_scopes||[]),...(cap.required_comment_scopes||[])]);",
    "function scopeResult(cap:any,granted:string[]){const req=uniq([...(cap.required_publish_scopes||[]),...(cap.required_engagement_scopes||[]),...(cap.required_comment_scopes||[])]);",'scope union')
rep("uniq([...(cap.required_publish_scopes||[]),...(cap.required_comment_scopes||[])])",
    "uniq([...(cap.required_publish_scopes||[]),...(cap.required_engagement_scopes||[]),...(cap.required_comment_scopes||[])])",'early missing scope unions',all=True)
old="else if(platform==='linkedin'){const orgId=String(c.metadata?.organization_id||c.external_account_id||'').replace(/^urn:li:organization:/,'');if(/^\\d+$/.test(orgId)){const r=await fetch(`https://api.linkedin.com/rest/organizations/${orgId}`,{headers:linkedinHeaders(t.access_token)});api=await r.json();identity_ok=r.ok&&String(api.id||'')===orgId;extra.organization_verified=identity_ok;extra.organization_status=r.status}else{identity_ok=false;extra.identity_error='LinkedIn Company Page is not selected/verified'}}"
new="else if(platform==='linkedin'){const orgId=String(c.metadata?.organization_id||c.external_account_id||'').replace(/^urn:li:organization:/,'');if(/^\\d+$/.test(orgId)){const r=await fetch(`https://api.linkedin.com/rest/organizations/${orgId}`,{headers:linkedinHeaders(t.access_token)});api=await r.json();identity_ok=r.ok&&String(api.id||'')===orgId;extra.organization_verified=identity_ok;extra.organization_status=r.status;if(identity_ok&&granted.includes('r_organization_social')){const urn=enc(`urn:li:organization:${orgId}`);const er=await fetch(`https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${urn}`,{headers:linkedinHeaders(t.access_token)});extra.engagement_status=er.status;extra.engagement_probe_ok=er.ok}}else{identity_ok=false;extra.identity_error='LinkedIn Company Page is not selected/verified'}}"
rep(old,new,'linkedin engagement probe')
old2="let engagement_ok=!cap.engagement_metrics_supported||(cap.required_publish_scopes||[]).concat(cap.required_comment_scopes||[]).some((s:string)=>granted.includes(s));if(platform==='youtube'&&cap.engagement_metrics_supported)engagement_ok=extra.analytics_ok===true;"
new2="const engagementScopes=cap.required_engagement_scopes||[];let engagement_ok=!cap.engagement_metrics_supported||engagementScopes.every((s:string)=>granted.includes(s));if(platform==='youtube'&&cap.engagement_metrics_supported)engagement_ok=engagement_ok&&extra.analytics_ok===true;if(platform==='linkedin'&&cap.engagement_metrics_supported)engagement_ok=engagement_ok&&extra.engagement_probe_ok===true;"
rep(old2,new2,'engagement gate')
p.write_text(s)
