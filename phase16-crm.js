(()=>{
const sb=window.allshieldSupabase;
if(!sb){console.error("CRM: Supabase unavailable");return;}

const esc=v=>String(v??"")
.replace(/&/g,"&amp;").replace(/</g,"&lt;")
.replace(/>/g,"&gt;").replace(/"/g,"&quot;");

const statuses=["new","contacted","quoted","follow_up","won","lost"];

function products(x){
 const a=Array.isArray(x.coverage_types)&&x.coverage_types.length
   ?x.coverage_types:[x.coverage_type];
 return a.filter(Boolean).join(", ")||"Other";
}

window.loadAllshieldCRM=async function(){
 const rows=document.getElementById("crmRows");
 const stats=document.getElementById("crmStats");
 if(!rows)return;

 rows.innerHTML='<tr><td colspan="8">Loading live leads...</td></tr>';

 try{
  const {data,error}=await sb.from("coverage_leads")
   .select("id,full_name,email,phone,coverage_type,coverage_types,status,source,assigned_to,notes,created_at,updated_at")
   .order("created_at",{ascending:false})
   .limit(250);

  if(error)throw error;

  const leads=data||[];
  const counts={};
  statuses.forEach(s=>counts[s]=leads.filter(x=>x.status===s).length);

  if(stats)stats.innerHTML=`
   <div class="stat"><div class="label">TOTAL LEADS</div><div class="value">${leads.length}</div></div>
   <div class="stat"><div class="label">NEW</div><div class="value">${counts.new||0}</div></div>
   <div class="stat"><div class="label">FOLLOW UP</div><div class="value">${counts.follow_up||0}</div></div>
   <div class="stat"><div class="label">WON</div><div class="value">${counts.won||0}</div></div>`;

  if(!leads.length){
   rows.innerHTML='<tr><td colspan="8">No customer leads yet.</td></tr>';
   return;
  }

  rows.innerHTML=leads.map(x=>`
   <tr data-crm-row="${x.id}">
    <td><strong>${esc(x.full_name)}</strong><br><small>${new Date(x.created_at).toLocaleString()}</small></td>
    <td>${esc(x.phone||"—")}<br><small>${esc(x.email)}</small></td>
    <td>${esc(products(x))}</td>
    <td>
     <select class="mini-input" id="crmStatus-${x.id}">
      ${statuses.map(s=>`<option value="${s}" ${x.status===s?"selected":""}>${s.replace("_"," ")}</option>`).join("")}
     </select>
    </td>
    <td>${esc(x.source||"website")}</td>
    <td><div style="white-space:pre-wrap;max-width:260px">${esc(x.notes||"—")}</div></td>
    <td>${x.assigned_to?"Assigned":"Unassigned"}</td>
    <td>
     <button class="tiny-btn" onclick="saveCRMLead('${x.id}')">Save</button>
    </td>
   </tr>`).join("");

 }catch(e){
  console.error(e);
  rows.innerHTML='<tr><td colspan="8">Unable to load CRM: '+esc(e.message||e)+'</td></tr>';
 }
};

window.saveCRMLead=async function(id){
 try{
  const status=document.getElementById("crmStatus-"+id)?.value;
  if(!statuses.includes(status))throw new Error("Invalid lead status.");

  const {data:userData}=await sb.auth.getUser();
  const actor=userData?.user?.id||null;

  const {error}=await sb.from("coverage_leads")
   .update({status,updated_at:new Date().toISOString()})
   .eq("id",id);

  if(error)throw error;

  const {error:auditError}=await sb.from("pipeline_activity").insert({
   entity_type:"coverage_lead",
   entity_id:id,
   actor_id:actor,
   action:"status_updated",
   details:{status}
  });

  if(auditError)console.error("CRM activity log:",auditError);

  await window.loadAllshieldCRM();

 }catch(e){
  console.error(e);
  alert(e.message||String(e));
 }
};

window.filterCRM=function(){
 const q=(document.getElementById("crmSearch")?.value||"").toLowerCase();
 document.querySelectorAll("#crmRows tr[data-crm-row]").forEach(row=>{
  row.style.display=row.textContent.toLowerCase().includes(q)?"":"none";
 });
};

function install(){
 if(typeof ownerViews==="undefined")return;

 ownerViews.crm=`
 <div class="dashboard-head">
  <div>
   <div class="kicker">CUSTOMER RELATIONSHIP MANAGEMENT</div>
   <h2>CRM & Lead Routing</h2>
   <p>Work customer protection requests from first inquiry through follow-up and conversion.</p>
  </div>
  <button class="btn btn-primary" onclick="loadAllshieldCRM()">Refresh Leads</button>
 </div>

 <div class="real-data-banner">LIVE SUPABASE DATA • OWNER / ADMIN CONTROL</div>

 <div id="crmStats" class="stat-grid" style="margin-top:18px"></div>

 <div class="bo-card" style="margin-top:18px">
  <input id="crmSearch" class="mini-input"
   style="max-width:420px"
   placeholder="Search name, email, phone, product or notes"
   oninput="filterCRM()">
 </div>

 <div class="bo-card" style="margin-top:18px;overflow:auto">
  <table class="rank-table" style="width:100%">
   <thead><tr>
    <th>Customer</th><th>Contact</th><th>Protection Needs</th>
    <th>Status</th><th>Source</th><th>Notes</th>
    <th>Assignment</th><th>Action</th>
   </tr></thead>
   <tbody id="crmRows">
    <tr><td colspan="8">Loading live leads...</td></tr>
   </tbody>
  </table>
 </div>`;

 const side=document.querySelector("#ownerPortal .sidebar");
 if(side&&!side.querySelector("[data-crm-live]")){
  const link=document.createElement("div");
  link.className="side-link";
  link.dataset.crmLive="1";
  link.textContent="◆ CRM & Lead Routing";
  link.onclick=function(){
   window.showOwnerView("crm",this);
   setTimeout(window.loadAllshieldCRM,25);
  };

  const communications=[...side.querySelectorAll(".side-link")]
   .find(x=>/Company Communications/i.test(x.textContent));

  if(communications)communications.insertAdjacentElement("beforebegin",link);
  else side.appendChild(link);
 }
}

if(document.readyState==="loading"){
 document.addEventListener("DOMContentLoaded",()=>setTimeout(install,50));
}else{
 setTimeout(install,50);
}
})();
