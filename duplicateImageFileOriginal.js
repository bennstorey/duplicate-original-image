(function () {
  console.log("✅ E6 Plugin: Duplicate Original Image - Dossier Button");

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

      const ticket = sessionInfo.ticket;
      const serverUrl = sessionInfo.studioServerUrl;
      const authHeader = ticket ? {} : { "X-Requested-With": "XMLHttpRequest" };

      if (!serverUrl) {
        console.error("❌ Missing serverUrl in session info:", sessionInfo);
        ContentStationSdk.showNotification({ content: "❌ Cannot duplicate image: missing server URL." });
        return;
      }

      try {
        const diagHeaders = { "Content-Type": "application/json", ...authHeader };

        const methods = [
          {
            label: "🧱 GetObjectTemplate",
            method: "GetObjectTemplate",
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), Type: "Image" })
          },
          {
            label: "📘 GetMetaDataInfo",
            method: "GetMetaDataInfo",
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectType: "Image" })
          },
          {
            label: "🧾 GetWorkflowInfo",
            method: "GetWorkflowInfo",
            body: JSON.stringify(ticket ? { Ticket: ticket } : {})
          },
          {
            label: "🧩 GetObjectTemplate (WWAsset)",
            method: "GetObjectTemplate",
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), Type: "WWAsset" })
          },
          {
            label: "📘 GetMetaDataInfo (WWAsset)",
            method: "GetMetaDataInfo",
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectType: "WWAsset" })
          }
        ];

        for (const { label, method, body } of methods) {
          console.log(`${label} → Sending to ${method} with body:`, body);
          const res = await fetch(`${serverUrl}/index.php?protocol=JSON&method=${method}`, {
            method: "POST",
            headers: diagHeaders,
            body
          });
          console.log(`${label} → HTTP ${res.status} ${res.statusText}`);
          console.log(`${label} → Headers:`, [...res.headers.entries()]);

          const raw = await res.text();
          console.log(`${label} raw:`, raw);
          if (raw.trim()) {
            try {
              const parsed = JSON.parse(raw);
              console.log(`${label} parsed:`, parsed);
            } catch (e) {
              console.warn(`${label} not valid JSON`, e);
            }
          } else {
            console.warn(`${label} returned an empty body.`);
          }
        }

        ContentStationSdk.showNotification({
          content: `✅ Fetched diagnostics for image creation. See console.`
        });
      } catch (err) {
        console.error("❌ Failed during diagnostics:", err);
        ContentStationSdk.showNotification({
          content: `❌ Diagnostics failed. See console for details.`
        });
      }
    }
  });
})();
