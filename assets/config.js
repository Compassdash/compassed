/* CompassED configuration. Edit this file only. */
window.CE_CONFIG = {
  // Same Supabase project as Compass Dash (the publishable/anon key is safe to ship in the page).
  supabaseUrl: "https://eqaxgofniwyhvwmdzwsm.supabase.co",
  supabaseKey: "sb_publishable_vTiRujcTfiNs8QhtC2z0DQ_wLsFljBV",

  // Where Compass Dash lives (links in the sidebar and on the progress page).
  compassDashUrl: "https://compassdash.github.io/Compassdash/",

  // Microsoft 365 / Teams. Leave clientId empty until the school's IT admin registers the app (see README).
  microsoft: {
    clientId: "",              // Entra ID app registration > Application (client) ID
    tenantId: "organizations", // or the school's tenant id for single-tenant sign-in
    // The ce-teams edge function does the Graph calls that need the client secret.
    functionUrl: "https://eqaxgofniwyhvwmdzwsm.supabase.co/functions/v1/ce-teams"
  },

  // Preview mode: a built-in sample school kept in this browser only, so the site can be tried without the database.
  // It switches on automatically on localhost or with ?demo=1; set to false to disable entirely.
  allowDemo: true
};
