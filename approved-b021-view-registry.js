(()=>{
  window.allshieldViewHandlers = window.allshieldViewHandlers || {agent:{},admin:{},owner:{}};
  window.registerAllshieldView = function(role,view,handler){
    if(!window.allshieldViewHandlers[role]) window.allshieldViewHandlers[role]={};
    window.allshieldViewHandlers[role][view]=handler;
  };
  function activate(role,el){
    if(!el)return;
    const portal=document.getElementById(role+'Portal');
    portal?.querySelectorAll('.sidebar .side-link').forEach(x=>x.classList.remove('active'));
    el.classList.add('active');
  }
  function install(role,name,hostId){
    const fallback=window[name];
    window[name]=function(view,el){
      const handler=window.allshieldViewHandlers?.[role]?.[view];
      if(typeof handler==='function'){
        activate(role,el);
        const host=document.getElementById(hostId);
        if(!host)return true;
        host.removeAttribute('data-production-enhancing');
        host.removeAttribute('data-live-backoffice-busy');
        Promise.resolve(handler(host,view,el)).catch(err=>{
          console.error(`Allshield ${role}/${view} failed`,err);
          host.innerHTML=`<div class="bo-card"><h3>Unable to load this section</h3><p>${String(err?.message||err||'Unknown error')}</p></div>`;
        });
        return true;
      }
      return typeof fallback==='function'?fallback.call(this,view,el):false;
    };
  }
  install('agent','showAgentView','agentMain');
  install('admin','showAdminView','adminMain');
  install('owner','showOwnerView','ownerMain');
  window.__approvedB021ViewRegistry=true;
})();
