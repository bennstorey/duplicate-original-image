(function () {
  console.log("✅ D6 Plugin: Duplicate Original Image - Dossier Button");

  let sessionInfo = null;

  if (typeof ContentStationSdk.registerDossierToolbarButton !== "function") {
    console.warn("⚠️ registerDossierToolbarButton not found — continuing anyway (may be contextual)");
  }

  ContentStationSdk.registerDossierToolbarButton({
    id: "duplicate-original-image-button",
    label: "Duplicate Original Image",
    icon: "Copy",
    onAction: async function (context) {
      console.log("🟡 Duplicate dossier button clicked — initiating handler");
      try {
        const selection = context?.items;
        const dossier = context?.dossier;
        console.log("📦 Selection:", selection);
        console.log("📁 Dossier:", dossier);
        if (!selection || selection.length === 0 || !dossier) {
          console.warn("⚠️ Missing selection or dossier");
          return;
        }

        // Placeholder for future duplication logic
        console.log("🔧 Duplication logic to be implemented");
      } catch (err) {
        console.error("❌ Failed to duplicate image(s):", err);
      }
    }
  });

  ContentStationSdk.onSignin((info) => {
    console.log("🔑 Signin callback received:", info);
    if (info && typeof info === "object") {
      sessionInfo = {
        ticket: info.Ticket || '',
        studioServerUrl: info.Url || `${location.origin}/server`
      };
    }
    if (!sessionInfo?.ticket) {
      console.warn("⚠️ Ticket not present — using cookie-based auth");
    }
    console.log("🔍 Parsed session info:", sessionInfo);

    const ticket = sessionInfo?.ticket;
    const serverUrl = sessionInfo?.studioServerUrl || `${location.origin}/server`;
    const diagHeaders = {
      "Content-Type": "application/json",
      ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" })
    };
    const diagBody = JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}) });

    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetConfigInfo`, {
      method: "POST",
      headers: diagHeaders,
      body: diagBody,
      credentials: "include"
    })
      .then(async res => {
        console.log("🧪 GetConfigInfo status:", res.status);
        const text = await res.text();
        console.log("🧪 GetConfigInfo raw text:", text);
        if (text.trim().length === 0) return console.warn("⚠️ GetConfigInfo returned empty response body");
        try {
          const json = JSON.parse(text);
          console.log("🧩 GetConfigInfo JSON:", json);
        } catch (e) {
          console.warn("⚠️ GetConfigInfo failed to parse JSON:", e);
        }
      })
      .catch(err => console.warn("⚠️ GetConfigInfo request failed:", err));

    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
      method: "POST",
      headers: diagHeaders,
      body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), RequestedType: "Image" }),
      credentials: "include"
    })
      .then(async res => {
        console.log("🧪 GetObjectTemplate status:", res.status);
        const text = await res.text();
        console.log("🧪 GetObjectTemplate raw text:", text);
        if (text.trim().length === 0) return console.warn("⚠️ GetObjectTemplate returned empty response body");
        try {
          const json = JSON.parse(text);
          console.log("🧱 GetObjectTemplate JSON:", json);
        } catch (e) {
          console.warn("⚠️ GetObjectTemplate failed to parse JSON:", e);
        }
      })
      .catch(err => console.warn("⚠️ GetObjectTemplate request failed:", err));

    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetMetaDataInfo`, {
      method: "POST",
      headers: diagHeaders,
      body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectType: "Image" }),
      credentials: "include"
    })
      .then(async res => {
        console.log("🧪 GetMetaDataInfo status:", res.status);
        const text = await res.text();
        console.log("🧪 GetMetaDataInfo raw text:", text);
        if (text.trim().length === 0) return console.warn("⚠️ GetMetaDataInfo returned empty response body");
        try {
          const json = JSON.parse(text);
          console.log("📘 GetMetaDataInfo JSON:", json);
        } catch (e) {
          console.warn("⚠️ GetMetaDataInfo failed to parse JSON:", e);
        }
      })
      .catch(err => console.warn("⚠️ GetMetaDataInfo request failed:", err));
  });
})();
