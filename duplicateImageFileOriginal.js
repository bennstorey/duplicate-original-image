(function () {
  console.log("✅ E9 Plugin: Duplicate Original Image - Dossier Button");

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
        const headers = { "Content-Type": "application/json", ...authHeader };

        // Diagnostic phase
        const templateRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
          method: "POST",
          headers,
          body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), Type: "Image" })
        });
        const templateText = await templateRes.text();
        console.log("🧱 Template raw:", templateText);

        const metaRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetMetaDataInfo`, {
          method: "POST",
          headers,
          body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectType: "Image" })
        });
        const metaText = await metaRes.text();
        console.log("📘 Metadata raw:", metaText);

        let template = null;
        let metadata = null;
        try { template = JSON.parse(templateText); } catch (e) { console.warn("⚠️ Could not parse template JSON", e); }
        try { metadata = JSON.parse(metaText); } catch (e) { console.warn("⚠️ Could not parse metadata JSON", e); }

        if (!template?.Object || !metadata?.MetaDataInfo) {
          throw new Error("Missing diagnostic info from server");
        }

        // Show required metadata fields
        const requiredFields = metadata.MetaDataInfo
          .filter(field => field.Required)
          .map(field => field.Name);

        console.log("📌 Required metadata fields:", requiredFields);
        console.log("🧾 Object template for Image:", template.Object);

        ContentStationSdk.showNotification({
          content: `📦 Diagnostics complete. Check console for required fields.`
        });

      } catch (err) {
        console.error("❌ Diagnostics fetch failed:", err);
        ContentStationSdk.showNotification({
          content: `❌ Diagnostics failed. See console.`
        });
      }
    }
  });
})();
