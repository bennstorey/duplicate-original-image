(function () {
  console.log("✅ E10 Plugin: Duplicate Original Image - Dossier Button");

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

        // Fetch template and metadata info
        const [templateRes, metaRes] = await Promise.all([
          fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), Type: "Image" })
          }),
          fetch(`${serverUrl}/index.php?protocol=JSON&method=GetMetaDataInfo`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectType: "Image" })
          })
        ]);

        const [templateText, metaText] = await Promise.all([templateRes.text(), metaRes.text()]);
        console.log("🧱 Template raw:", templateText);
        console.log("📘 Metadata raw:", metaText);

        let template = null;
        let metadata = null;
        try { template = JSON.parse(templateText); } catch (e) { console.warn("⚠️ Could not parse template JSON", e); }
        try { metadata = JSON.parse(metaText); } catch (e) { console.warn("⚠️ Could not parse metadata JSON", e); }

        if (!template?.Object || !metadata?.MetaDataInfo) {
          throw new Error("Missing diagnostic info from server");
        }

        // Auto-populate payload based on template and required metadata
        const payload = {
          ...(ticket ? { Ticket: ticket } : {}),
          Objects: [template.Object]
        };
        payload.Objects[0].Name = "test_from_template";
        payload.Objects[0].TargetName = "test_from_template";
        payload.Objects[0].Dossier = { ID: dossier.ID };

        console.log("📨 Final payload based on template:", JSON.stringify(payload, null, 2));

        const createRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=CreateObjects`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });

        const rawText = await createRes.text();
        console.log("📥 CreateObjects response text:", rawText);

        ContentStationSdk.showNotification({
          content: `🔍 CreateObjects sent — check console for response.`
        });

      } catch (err) {
        console.error("❌ Operation failed:", err);
        ContentStationSdk.showNotification({
          content: `❌ Operation failed. See console.`
        });
      }
    }
  });
})();
