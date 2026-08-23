
(() => {
  const cfg = window.ALLSHIELD_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_PUBLISHABLE_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR_PROJECT") &&
    !cfg.SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE");

  let sb = null;
  if (configured && window.supabase) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
    document.querySelectorAll("[data-backend-status]").forEach(el => {
      el.textContent = "Supabase connected";
      el.classList.add("live");
    });
  }

  window.allshieldSupabase = sb;

  async function getProfile(userId) {
    if (!sb) return null;
    const { data, error } = await sb
      .from("profiles")
      .select("id,email,first_name,last_name,role,status,resident_state,department_id,manager_id")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  }

  async function runLiveDashboardLoader(requestedRole) {
    const loaderName = {
      agent: "loadLiveAgentDashboard",
      admin: "loadAdminLiveDashboard",
      owner: "loadOwnerLiveDashboard"
    }[requestedRole];

    if (!loaderName) return;

    for (let attempt = 0; attempt < 20; attempt++) {
      const loader = window[loaderName];
      if (typeof loader === "function") {
        await loader();
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.warn(`${loaderName} was not available after login.`);
  }

  async function productionLogin(requestedRole) {
    if (!sb) {
      if (cfg.DEMO_FALLBACK !== false) {
        window.enterPortal(requestedRole);
        return;
      }
      alert("Supabase has not been configured yet.");
      return;
    }

    const card = document.getElementById(requestedRole + "Login");
    const loginValue = card?.querySelector('input[type="text"],input:not([type])')?.value?.trim()
      || card?.querySelector('input[placeholder*="username" i]')?.value?.trim()
      || card?.querySelector('input[placeholder*="email" i]')?.value?.trim();
    const password = card?.querySelector('input[type="password"]')?.value || "";

    if (!loginValue || !password) {
      alert("Enter your username and password.");
      return;
    }

    let email = loginValue;
    if (!loginValue.includes("@")) {
      const username = loginValue.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
        alert("Username not recognized.");
        return;
      }
      email = `${username}@${cfg.INTERNAL_EMAIL_DOMAIN || "allshield.internal"}`;
    }

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      return;
    }

    try {
      const profile = await getProfile(data.user.id);
      const role = profile?.role || "agent";

      const allowed = {
        agent: ["agent","team_lead","manager","admin","owner"],
        admin: ["admin","owner"],
        owner: ["owner"]
      };

      if (!allowed[requestedRole].includes(role)) {
        await sb.auth.signOut();
        alert("Your account does not have permission to enter this portal.");
        return;
      }

      window.currentAllshieldProfile = profile;
      window.enterPortal(requestedRole);

      if (requestedRole === "agent") {
        await loadAgentDashboard(data.user.id);
      } else if (requestedRole === "admin") {
        await loadAdminDashboard();
      } else if (requestedRole === "owner") {
        await loadOwnerDashboard();
      }

      await runLiveDashboardLoader(requestedRole);
    } catch (err) {
      await sb.auth.signOut();
      alert("Unable to load your Allshield profile.");
      console.error(err);
    }
  }
  window.productionLogin = productionLogin;

  async function loadAgentDashboard(userId) {
    if (!sb) return;
    const [onboarding, licenses, scores, production] = await Promise.all([
      sb.from("onboarding_progress").select("*").eq("user_id", userId).order("step_order"),
      sb.from("user_state_licenses").select("*").eq("user_id", userId),
      sb.from("exam_attempts").select("score_percent,created_at,exam_type,state_code").eq("user_id", userId).order("created_at",{ascending:false}).limit(10),
      sb.from("production_entries").select("period_start,period_end,sales_count,quality_score").eq("user_id", userId).order("period_start",{ascending:false}).limit(12)
    ]);

    window.allshieldData = {
      onboarding: onboarding.data || [],
      licenses: licenses.data || [],
      scores: scores.data || [],
      production: production.data || []
    };
  }

  function setPortalStat(portalSelector, label, value) {
    document.querySelectorAll(`${portalSelector} .stat`).forEach(card => {
      const cardLabel = card.querySelector(".label")?.textContent?.trim();
      if (cardLabel === label) {
        const valueEl = card.querySelector(".value");
        if (valueEl) valueEl.textContent = String(value);
      }
    });
  }

  async function loadAdminDashboard() {
    if (!sb) return;

    const [profilesResult, attemptsResult] = await Promise.all([
      sb.from("profiles")
        .select("id,first_name,last_name,role,status,resident_state,manager_id")
        .order("last_name"),
      sb.from("exam_attempts")
        .select("score_percent")
        .order("created_at", { ascending: false })
        .limit(500)
    ]);

    const profiles = profilesResult.data || [];
    const attempts = attemptsResult.data || [];
    window.allshieldAdminData = profiles;

    const salesRoles = new Set(["agent", "team_lead", "manager"]);
    const activeAgents = profiles.filter(p => salesRoles.has(p.role) && p.status === "active").length;
    const onboarding = profiles.filter(p => p.status === "onboarding").length;
    const invited = profiles.filter(p => p.status === "invited").length;
    const scored = attempts
      .map(a => Number(a.score_percent))
      .filter(Number.isFinite);
    const avgScore = scored.length
      ? `${Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)}%`
      : "—";

    setPortalStat("#adminPortal", "Active Agents", activeAgents);
    setPortalStat("#adminPortal", "In Onboarding", onboarding);
    setPortalStat("#adminPortal", "Ready to Activate", invited);
    setPortalStat("#adminPortal", "Avg. Test Score", avgScore);
  }

  async function loadOwnerDashboard() {
    if (!sb) return;
    await loadAdminDashboard();

    const [profilesResult, licensesResult] = await Promise.all([
      sb.from("profiles").select("id,role,status"),
      sb.from("user_state_licenses").select("state_code,status")
    ]);

    if (profilesResult.error || licensesResult.error) {
      console.warn("Owner metrics could not be fully refreshed.", profilesResult.error || licensesResult.error);
      setPortalStat("#ownerPortal", "Platform Health", "CHECK");
      return;
    }

    const profiles = profilesResult.data || [];
    const licenses = licensesResult.data || [];
    const salesRoles = new Set(["agent", "team_lead", "manager"]);
    const activeAgents = profiles.filter(p => salesRoles.has(p.role) && p.status === "active").length;
    const states = new Set(licenses.map(row => String(row.state_code || "").trim()).filter(Boolean));

    setPortalStat("#ownerPortal", "Active Agents", activeAgents);
    setPortalStat("#ownerPortal", "States Enabled", states.size);
    setPortalStat("#ownerPortal", "Licensing Tracks", licenses.length);
    setPortalStat("#ownerPortal", "Platform Health", "LIVE");
  }

  window.allshieldSaveOnboardingStep = async function(stepKey, completed, metadata={}) {
    if (!sb) return false;
    const user = (await sb.auth.getUser()).data.user;
    if (!user) return false;
    const { error } = await sb.from("onboarding_progress").upsert({
      user_id: user.id,
      step_key: stepKey,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      metadata
    }, { onConflict: "user_id,step_key" });
    if (error) throw error;
    return true;
  };

  window.allshieldSaveTargetStates = async function(states) {
    if (!sb) return false;
    const user = (await sb.auth.getUser()).data.user;
    if (!user) return false;

    const rows = states.map(code => ({
      user_id: user.id,
      state_code: code,
      license_type: "life_health",
      status: "studying",
      is_resident: false
    }));

    const { error } = await sb
      .from("user_state_licenses")
      .upsert(rows, { onConflict: "user_id,state_code,license_type" });
    if (error) throw error;
    return true;
  };

  window.allshieldSaveExamAttempt = async function(payload) {
    if (!sb) return false;
    const user = (await sb.auth.getUser()).data.user;
    if (!user) return false;
    const { error } = await sb.from("exam_attempts").insert({
      user_id: user.id,
      exam_type: payload.examType || "practice",
      state_code: payload.stateCode || null,
      score_percent: payload.scorePercent,
      question_count: payload.questionCount,
      correct_count: payload.correctCount,
      attempt_payload: payload.attemptPayload || {}
    });
    if (error) throw error;
    return true;
  };

  window.allshieldSignOut = async function() {
    if (sb) await sb.auth.signOut();
    window.returnHome();
  };

  if (sb) {
    sb.auth.onAuthStateChange((_event, session) => {
      window.allshieldSession = session;
    });
  }
  window.allshieldListTeamUsers = async function() {
    if (!sb) return [];
    const { data, error } = await sb
      .from("profiles")
      .select("id,username,first_name,last_name,email,role,status,resident_state,department_id,manager_id,created_at,departments(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  };

  window.allshieldListDepartments = async function() {
    if (!sb) return [];
    const { data, error } = await sb.from("departments").select("id,name,slug").order("name");
    if (error) throw error;
    return data || [];
  };

  window.allshieldManageTeamUser = async function(payload) {
    if (!sb) throw new Error("Supabase is not connected.");
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("Your Owner session has expired. Sign out and back in.");
    const response = await fetch(`${cfg.SUPABASE_URL}/functions/v1/manage-team-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": cfg.SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw || `HTTP ${response.status}` }; }
    if (!response.ok) throw new Error(data?.error || data?.message || `Edge Function error ${response.status}`);
    if (data?.error) throw new Error(data.error);
    return data;
  };

})();
