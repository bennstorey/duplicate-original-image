(function () {
  console.log("✅ C9 Plugin: Duplicate Original Image - Dossier Button");

  let sessionInfo = null;

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

    // Extended diagnostics to verify required fields
    const diagnostics = [
      { method: "GetConfigInfo", label: "🧩 GetConfigInfo" },
      { method: "GetObjectTemplate", label: "🧱 GetObjectTemplate (Image)", payload: { Type: "Image" } },
      { method: "GetMetaDataInfo", label: "📘 GetMetaDataInfo (Image)", payload: { ObjectType: "Image" } },
      { method: "GetObjectInfo", label: "🧮 GetObjectInfo" }
    ];

    diagnostics.forEach(({ method, label, payload }) => {
      const body = JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ...(payload || {}) });
      fetch(`${serverUrl}/index.php?protocol=JSON&method=${method}`, {
        method: "POST",
        headers: diagHeaders,
        body
      })
        .then(res => res.text())
        .then(txt => {
          console.log(`${label} text:`, txt);
          try { console.log(`${label} JSON:`, JSON.parse(txt)); } catch (e) { console.warn(`⚠️ ${label} Invalid JSON`); }
        })
        .catch(err => console.warn(`⚠️ ${label} failed:`, err));
    });
  });

  ContentStationSdk.addDossierToolbarButton({
    label: "Duplicate Original Image(s)",
    id: "duplicate-original-image-button",
    onInit: (button, selection) => {
      button.isDisabled = !selection || selection.length === 0 || !selection.every(item => item.Type === "Image");
    },
    onAction: async (button, selection, dossier) => {
      console.log("🟡 Duplicate button clicked");
    }
  });
})();
