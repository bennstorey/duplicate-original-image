(function () {
  console.log("✅ E4 Plugin: Duplicate Original Image - Dossier Button");

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
        // --- FETCH TEMPLATE AND METADATA INFO FOR VALIDATION ---
        const diagHeaders = { "Content-Type": "application/json", ...authHeader };

        const templateRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
          method: "POST",
          headers: diagHeaders,
          body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), Type: "Image" })
        });
        const templateRaw = await templateRes.text();
        console.log("🧱 GetObjectTemplate raw:", templateRaw);
        if (templateRaw.trim()) {
          try {
            const parsed = JSON.parse(templateRaw);
            console.log("🧱 GetObjectTemplate parsed:", parsed);
          } catch (e) {
            console.warn("⚠️ Template not valid JSON", e);
          }
        }

        const metaInfoRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetMetaDataInfo`, {
          method: "POST",
          headers: diagHeaders,
          body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectType: "Image" })
        });
        const metaInfoRaw = await metaInfoRes.text();
        console.log("📘 GetMetaDataInfo raw:", metaInfoRaw);
        if (metaInfoRaw.trim()) {
          try {
            const parsed = JSON.parse(metaInfoRaw);
            console.log("📘 GetMetaDataInfo parsed:", parsed);
          } catch (e) {
            console.warn("⚠️ MetaDataInfo not valid JSON", e);
          }
        }

        const workflowInfoRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetWorkflowInfo`, {
          method: "POST",
          headers: diagHeaders,
          body: JSON.stringify(ticket ? { Ticket: ticket } : {})
        });
        const workflowRaw = await workflowInfoRes.text();
        console.log("🧾 GetWorkflowInfo raw:", workflowRaw);
        if (workflowRaw.trim()) {
          try {
            const parsed = JSON.parse(workflowRaw);
            console.log("🧾 GetWorkflowInfo parsed:", parsed);
          } catch (e) {
            console.warn("⚠️ WorkflowInfo not valid JSON", e);
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
