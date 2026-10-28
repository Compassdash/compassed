/* Microsoft 365 sign-in and Teams calls for CompassED.
   Sign-in uses the standard authorization-code flow with PKCE straight from the page (no library), which is what
   Microsoft recommends for single-page apps. Anything that needs the client secret or writes Microsoft data into
   the database goes through the ce-teams edge function (supabase/functions/ce-teams/index.ts).
   Prerequisite (IT admin): an Entra ID app registration of type "Single-page application" with this site's
   signin.html and teach.html as redirect URIs, and admin consent for the Graph permissions listed in the README. */
(function () {
  const C = (CE.cfg.microsoft || {});
  const SCOPES_SIGNIN = "openid profile email User.Read";
  const SCOPES_TEACHER = "openid profile email User.Read Team.ReadBasic.All EduRoster.ReadBasic EduAssignments.ReadWrite ChannelMessage.Send Chat.Create ChatMessage.Send";
  const b64 = a => btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const rnd = n => b64(crypto.getRandomValues(new Uint8Array(n)));
  const authority = () => "https://login.microsoftonline.com/" + (C.tenantId || "organizations");
  const redirect = () => location.origin + location.pathname;

  const MS = CE.MS = {
    enabled: () => !!C.clientId && !CE.demo,
    /* Start the redirect. purpose: "signin" (any user) | "link" (attach to the signed-in CompassED account) | "teacher" (Teams scopes). */
    async signIn(purpose) {
      const verifier = rnd(48), challenge = b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))), state = rnd(16);
      sessionStorage.setItem("ce_ms", JSON.stringify({ verifier, state, purpose, hash: location.hash }));
      const p = new URLSearchParams({ client_id: C.clientId, response_type: "code", redirect_uri: redirect(), response_mode: "query", scope: purpose === "teacher" ? SCOPES_TEACHER : SCOPES_SIGNIN, code_challenge: challenge, code_challenge_method: "S256", state, prompt: "select_account" });
      location.href = authority() + "/oauth2/v2.0/authorize?" + p;
    },
    /* Call on page load. Returns null when this is not a redirect back from Microsoft. */
    async finish() {
      const q = new URLSearchParams(location.search), code = q.get("code"), st = q.get("state");
      if (!code) { if (q.get("error")) return { ok: false, error: q.get("error_description") || q.get("error") }; return null; }
      let saved = null; try { saved = JSON.parse(sessionStorage.getItem("ce_ms")); } catch (e) {}
      sessionStorage.removeItem("ce_ms");
      history.replaceState(null, "", location.pathname + (saved && saved.hash || ""));
      if (!saved || saved.state !== st) return { ok: false, error: "The sign-in did not come back from where it started. Try again." };
      const r = await fetch(authority() + "/oauth2/v2.0/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: C.clientId, grant_type: "authorization_code", code, redirect_uri: redirect(), code_verifier: saved.verifier }) });
      const tok = await r.json();
      if (!tok.id_token) return { ok: false, error: tok.error_description || "Microsoft did not return a token." };
      sessionStorage.setItem("ce_ms_tok", JSON.stringify({ access: tok.access_token, id: tok.id_token, exp: Date.now() + (tok.expires_in || 3600) * 1000 }));
      if (saved.purpose === "teacher") return { ok: true, purpose: "teacher" };
      if (saved.purpose === "link") return MS.fn("link", { id_token: tok.id_token });
      const who = await MS.fn("whoami", { id_token: tok.id_token });
      if (!who.ok) return who;
      if (who.role === "teacher") { const me = await CE.api("ce_t_me", { p_key: who.tok }); return { ok: true, role: "teacher", tok: who.tok, me }; }
      const me = await CE.api("ce_s_login", { p_code: who.code, p_user: who.username });
      if (!me.ok) return me;
      return { ok: true, role: "student", student: { code: me.code, username: me.username, sid: me.sid, house: me.house, year: me.year, class: me.class, subjects: me.subjects } };
    },
    token() { try { const t = JSON.parse(sessionStorage.getItem("ce_ms_tok")); return t && t.exp > Date.now() ? t : null; } catch (e) { return null; } },
    /* Call the ce-teams edge function. The CompassED identity (student code+user or teacher key) is always sent so the
       function can check who is asking before touching Microsoft or the database. */
    async fn(action, body) {
      if (!C.functionUrl) return { ok: false, error: "not_configured" };
      const t = MS.token();
      const r = await fetch(C.functionUrl, { method: "POST", headers: { "Content-Type": "application/json", apikey: CE.cfg.supabaseKey, Authorization: "Bearer " + CE.cfg.supabaseKey },
        body: JSON.stringify(Object.assign({ action, ms_token: t && t.access, id_token: t && t.id }, CE.student.args(), CE.teacher.args(), body || {})) });
      if (r.status === 404) return { ok: false, error: "The ce-teams edge function is not deployed yet (see README)." };
      return r.json();
    }
  };
})();
