(function () {
  console.log("✅ C13 Plugin: Duplicate Original Image - Dossier Button");

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

    const diagnostics = [
      { method: "GetConfigInfo", label: "🧩 GetConfigInfo" },
      { method: "GetObjectTemplate", label: "🧱 GetObjectTemplate (Image)", payload: { Type: "Image" } },
      { method: "GetMetaDataInfo", label: "📘 GetMetaDataInfo (Image)", payload: { ObjectType: "Image" } },
      { method: "GetObjectInfo", label: "🧮 GetObjectInfo" },
      { method: "GetServerInfo", label: "🔧 GetServerInfo" },
      { method: "GetBrands", label: "🏷️ GetBrands" },
      { method: "GetPublications", label: "📰 GetPublications" },
      { method: "GetCategories", label: "📂 GetCategories" },
      { method: "GetWorkflowInfo", label: "🧾 GetWorkflowInfo" }
    ];

    diagnostics.forEach(({ method, label, payload }) => {
      const fullPayload = { ...(ticket ? { Ticket: ticket } : {}), ...(payload || {}) };
      console.log(`📤 Sending ${label}:`, fullPayload);

      fetch(`${serverUrl}/index.php?protocol=JSON&method=${method}`, {
        method: "POST",
        headers: diagHeaders,
        body: JSON.stringify(fullPayload)
      })
        .then(async res => {
          console.log(`${label} → HTTP ${res.status} ${res.statusText}`);
          const raw = await res.text();
          console.log(`${label} raw response:`, raw);

          if (!raw || raw.trim().length === 0) {
            console.warn(`⚠️ ${label} returned empty body.`);
            ContentStationSdk.showNotification({
              content: `⚠️ ${label} returned no content.`
            });
            return;
          }

          try {
            const parsed = JSON.parse(raw);
            console.log(`${label} parsed JSON:`, parsed);
          } catch (e) {
            console.warn(`⚠️ ${label} response not valid JSON`, e);
            ContentStationSdk.showNotification({
              content: `⚠️ ${label} failed — response not valid JSON`
            });
          }
        })
        .catch(err => {
          console.warn(`⚠️ ${label} fetch failed:`, err);
          ContentStationSdk.showNotification({
            content: `❌ ${label} failed to load.`
          });
        });
    });
  });

  ContentStationSdk.addDossierToolbarButton({
    label: "Duplicate Original Image(s)",
    id: "duplicate-original-image-button",
    onInit: (button, selection) => {
      button.isDisabled = !selection || selection.length === 0 || !selection.every(item => item.Type === "Image");
    },
    onAction: async (button, selection, dossier) => {
      console.log("🟡 Duplicate dossier button clicked — initiating handler");
      console.log("📦 Selection:", selection);
      console.log("📁 Dossier:", dossier);

      if (!sessionInfo) {
        sessionInfo = ContentStationSdk.getInfo();
        console.log("🆗 Fallback: fetched session info via getInfo():", sessionInfo);
        if (!sessionInfo.studioServerUrl) {
          sessionInfo.studioServerUrl = `${location.origin}/server`;
        }
      }

      ContentStationSdk.showNotification({
        content: `🧪 Button clicked — diagnostics only mode.`
      });
    }
  });
})();
