(()=>{
function installProtectionIntake(){
  const modal=document.getElementById("leadModal");
  if(!modal)return;
  const card=modal.querySelector(".modal-card");
  if(!card)return;

  card.innerHTML=`
    <button class="close" onclick="closeLead()">×</button>
    <div class="kicker">START YOUR PROTECTION REVIEW</div>
    <h3>What would you like help protecting?</h3>
    <p style="color:#9eb1c5;line-height:1.6">
      Select everything that applies. An Allshield team member will use this information to prepare for your conversation.
    </p>

    <div class="form-grid">
      <div>
        <label>Full Name *</label>
        <input id="leadFullName" class="field" placeholder="Full name" autocomplete="name">
      </div>
      <div>
        <label>Email *</label>
        <input id="leadEmail" class="field" type="email" placeholder="Email address" autocomplete="email">
      </div>
      <div>
        <label>Phone *</label>
        <input id="leadPhone" class="field" type="tel" placeholder="Phone number" autocomplete="tel">
      </div>
      <div>
        <label>State *</label>
        <input id="leadState" class="field" maxlength="2" placeholder="TX">
      </div>
      <div>
        <label>ZIP Code *</label>
        <input id="leadZip" class="field" inputmode="numeric" maxlength="10" placeholder="75000">
      </div>
      <div>
        <label>Preferred Contact</label>
        <select id="leadPreferredContact" class="field">
          <option value="Phone">Phone</option>
          <option value="Text">Text</option>
          <option value="Email">Email</option>
        </select>
      </div>
    </div>

    <div style="margin:18px 0 8px;font-weight:700">Coverage you're interested in — select all that apply *</div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px;margin-bottom:18px">
      ${[
        "Health / ACA","Medicare","Life Insurance","Final Expense",
        "Dental / Vision","Auto","Home / Renters","Business / Commercial",
        "Supplemental","Other"
      ].map(x=>`
        <label style="display:flex;align-items:center;gap:9px;padding:11px 12px;border:1px solid rgba(255,255,255,.12);border-radius:10px;cursor:pointer">
          <input type="checkbox" name="coverageProduct" value="${x}">
          <span>${x}</span>
        </label>
      `).join("")}
    </div>

    <div class="form-grid">
      <div>
        <label>How soon do you need coverage?</label>
        <select id="leadTiming" class="field">
          <option value="As soon as possible">As soon as possible</option>
          <option value="Within 30 days">Within 30 days</option>
          <option value="1–3 months">1–3 months</option>
          <option value="Just researching">Just researching</option>
        </select>
      </div>
      <div>
        <label>Household Size</label>
        <input id="leadHousehold" class="field" type="number" min="1" max="30" placeholder="Example: 4">
      </div>
    </div>

    <label>Do you currently have coverage?</label>
    <input id="leadCurrentCoverage" class="field" placeholder="Optional — tell us what you currently have">

    <label>Anything else we should know?</label>
    <textarea id="leadNotes" class="field" style="min-height:100px;resize:vertical" placeholder="Tell us about your priorities, questions, or anything you'd like your agent to know."></textarea>

    <input id="leadWebsite" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">

    <div id="leadSubmitStatus" style="min-height:22px;margin:10px 0;color:#9eb1c5"></div>

    <button id="leadSubmitButton" class="btn btn-primary" style="width:100%" onclick="submitLead()">
      Request My Protection Review
    </button>

    <p style="font-size:11px;color:#71859a;line-height:1.5;margin-top:12px">
      Please do not submit Social Security numbers, payment information, medical records, or other sensitive personal information through this form.
    </p>
  `;
}

window.submitLead=async function(){
  const products=[...document.querySelectorAll('input[name="coverageProduct"]:checked')].map(x=>x.value);
  const full_name=document.getElementById("leadFullName")?.value.trim()||"";
  const email=document.getElementById("leadEmail")?.value.trim()||"";
  const phone=document.getElementById("leadPhone")?.value.trim()||"";
  const state=document.getElementById("leadState")?.value.trim().toUpperCase()||"";
  const zip=document.getElementById("leadZip")?.value.trim()||"";
  const status=document.getElementById("leadSubmitStatus");
  const btn=document.getElementById("leadSubmitButton");

  if(full_name.length<2)return status.textContent="Please enter your full name.";
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return status.textContent="Please enter a valid email address.";
  if(phone.length<7)return status.textContent="Please enter a phone number.";
  if(!/^[A-Z]{2}$/.test(state))return status.textContent="Please enter your 2-letter state abbreviation.";
  if(zip.length<5)return status.textContent="Please enter your ZIP code.";
  if(!products.length)return status.textContent="Please select at least one type of protection.";

  const cfg=window.ALLSHIELD_CONFIG||{};
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){
    return status.textContent="The protection request service is not connected. Please contact Allshield.";
  }

  btn.disabled=true;
  btn.textContent="Sending…";
  status.textContent="Submitting your protection request…";

  try{
    const res=await fetch(`${cfg.SUPABASE_URL}/functions/v1/public-intake`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "apikey":cfg.SUPABASE_PUBLISHABLE_KEY
      },
      body:JSON.stringify({
        action:"coverage",
        full_name,
        email,
        phone,
        state,
        zip,
        coverage_types:products,
        preferred_contact:document.getElementById("leadPreferredContact")?.value||"",
        timing:document.getElementById("leadTiming")?.value||"",
        household_size:document.getElementById("leadHousehold")?.value||"",
        current_coverage:document.getElementById("leadCurrentCoverage")?.value.trim()||"",
        notes:document.getElementById("leadNotes")?.value.trim()||"",
        website:document.getElementById("leadWebsite")?.value||""
      })
    });

    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.error)throw new Error(data.error||"Unable to submit your request.");

    status.style.color="#69d39b";
    status.textContent="Thank you. Your protection request has been received.";
    btn.textContent="Request Received";
  }catch(e){
    status.style.color="#ff8f8f";
    status.textContent=e.message||"Unable to submit your request.";
    btn.disabled=false;
    btn.textContent="Request My Protection Review";
  }
};

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",installProtectionIntake);
}else{
  installProtectionIntake();
}
})();

/* Build .002 — protection intake scrolling/accessibility fix */
(()=>{
  function fixProtectionModalScroll(){
    const modal=document.getElementById("leadModal");
    const card=modal?.querySelector(".modal-card");
    if(!modal||!card)return;

    modal.style.overflowY="auto";
    modal.style.overscrollBehavior="contain";
    modal.style.padding="24px 12px";
    modal.style.alignItems="flex-start";

    card.style.maxHeight="calc(100dvh - 48px)";
    card.style.overflowY="auto";
    card.style.overscrollBehavior="contain";
    card.style.webkitOverflowScrolling="touch";
    card.style.margin="auto";
    card.style.width="min(680px, 100%)";
    card.style.boxSizing="border-box";
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",fixProtectionModalScroll);
  }else{
    fixProtectionModalScroll();
  }

  const originalOpenLead=window.openLead;
  if(typeof originalOpenLead==="function"){
    window.openLead=function(){
      originalOpenLead.apply(this,arguments);
      setTimeout(fixProtectionModalScroll,0);
    };
  }
})();
