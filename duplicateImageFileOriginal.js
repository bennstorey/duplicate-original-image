(function () {
  console.log("✅ A84 Plugin: Duplicate Original Image - Dossier Button"); 

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

      if (!serverUrl) {
        console.error("❌ Missing serverUrl in session info:", sessionInfo);
        ContentStationSdk.showNotification({
          content: "❌ Cannot duplicate image: missing server URL."
        });
        return;
      }

      try {
        for (const selected of selection) {
          const objectId = selected.ID;

          const metadataRes = await fetch(
            `${serverUrl}/index.php?protocol=JSON&method=GetObjectMetaData`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectId: objectId })
            }
          );

          const meta = await metadataRes.json();

          const binaryRes = await fetch(
            `${serverUrl}/index.php?protocol=JSON&method=GetObjectBinary`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectId: objectId, Version: 1 })
            }
          );

          const buffer = await binaryRes.arrayBuffer();
          const blob = new Blob([buffer], { type: meta.Object.Format || "application/octet-stream" });
          const originalName = meta.Object.Name;
          const newName = "web_" + originalName;
          const file = new File([blob], newName, { type: blob.type });

          const form = new FormData();
          if (ticket) form.append("Ticket", ticket);
          form.append("File", file);

          const uploadRes = await fetch(
            `${serverUrl}/index.php?protocol=JSON&method=UploadFile`,
            {
              method: "POST",
              body: form
            }
          );

          const rawUploadText = await uploadRes.text();
          console.log("📤 Upload response text:", rawUploadText);

          let uploadJson;
          try {
            uploadJson = JSON.parse(rawUploadText);
          } catch (e) {
            console.error("❌ Failed to parse UploadFile JSON:", e);
            throw new Error("UploadFile did not return JSON");
          }

          const createRes = await fetch(
            `${serverUrl}/index.php?protocol=JSON&method=CreateObjects`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...(ticket ? { Ticket: ticket } : {}),
                Objects: [
                  {
                    __classname__: "com.woodwing.assets.server.object.Asset",
                    Name: newName,
                    Category: meta.Object.Category,
                    Dossier: dossier.ID,
                    ContentMetaData: {
                      ContentPath: uploadJson.Path
                    }
                  }
                ]
              })
            }
          );

          const createResult = await createRes.json();
          const newId = createResult.Objects?.[0]?.Id;
          console.log("✅ Created duplicate image with ID:", newId);
        }

        ContentStationSdk.showNotification({
          content: `✅ Duplicated ${selection.length} image(s) successfully.`
        });
      } catch (err) {
        console.error("❌ Failed to duplicate image(s):", err);
        ContentStationSdk.showNotification({
          content: `❌ Failed to duplicate one or more images. See console for details.`
        });
      }
    }
  });
})();
