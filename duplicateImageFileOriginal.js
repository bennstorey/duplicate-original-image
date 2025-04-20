(function () {
  console.log("✅ E7 Plugin: Duplicate Original Image - Dossier Button");

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

        // GetObjectTypes first
        console.log("🔎 Fetching object types via GetObjectTypes...");
        const typeRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTypes`, {
          method: "POST",
          headers,
          body: JSON.stringify(ticket ? { Ticket: ticket } : {})
        });
        const rawType = await typeRes.text();
        console.log("📦 GetObjectTypes raw:", rawType);

        let types = [];
        try {
          const parsed = JSON.parse(rawType);
          types = parsed?.ObjectTypes || [];
          console.log("📦 GetObjectTypes parsed:", types);
        } catch (e) {
          console.warn("⚠️ Failed to parse GetObjectTypes:", e);
        }

        if (!Array.isArray(types) || types.length === 0) {
          console.error("❌ No object types returned — cannot proceed.");
          return;
        }

        for (const type of types) {
          const label = `🔍 ${type}`;

          const templateRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), Type: type })
          });
          const templateText = await templateRes.text();
          console.log(`${label} → Template HTTP`, templateRes.status);
          console.log(`${label} → Template raw:`, templateText);

          const metaRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetMetaDataInfo`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectType: type })
          });
          const metaText = await metaRes.text();
          console.log(`${label} → Meta HTTP`, metaRes.status);
          console.log(`${label} → Meta raw:`, metaText);
        }

        ContentStationSdk.showNotification({
          content: `✅ Diagnostics complete. Check console for all object types.`
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
