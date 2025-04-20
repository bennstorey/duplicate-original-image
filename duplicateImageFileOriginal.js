(function () {
  console.log("✅ E1 Plugin: Duplicate Original Image - Dossier Button");

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
        const workflowRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetWorkflowInfo`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(ticket ? { Ticket: ticket } : {})
        });
        const workflowJson = await workflowRes.json();
        console.log("🧾 WorkflowInfo:", workflowJson);

        for (const selected of selection) {
          const objectId = selected.ID;

          const metadataRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectMetaData`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader },
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectId: objectId })
          });
          const meta = await metadataRes.json();
          console.log("🧠 Metadata:", meta);

          const binaryRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectBinary`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader },
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectId: objectId, Version: 1 })
          });
          const buffer = await binaryRes.arrayBuffer();
          const blob = new Blob([buffer], { type: meta.Object.Format || "application/octet-stream" });
          const file = new File([blob], "web_" + meta.Object.Name, { type: blob.type });

          const form = new FormData();
          if (ticket) form.append("Ticket", ticket);
          form.append("File", file);

          const uploadRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=UploadFile`, {
            method: "POST",
            headers: authHeader,
            body: form
          });

          const uploadText = await uploadRes.text();
          if (!uploadText || uploadText.trim().length === 0) throw new Error("UploadFile returned empty body");

          let uploadJson;
          try {
            uploadJson = JSON.parse(uploadText);
          } catch (e) {
            throw new Error("UploadFile did not return valid JSON");
          }

          const { UploadToken, ContentPath } = uploadJson;
          if (!UploadToken || !ContentPath) throw new Error("UploadFile missing required fields");

          const payload = {
            ...(ticket ? { Ticket: ticket } : {}),
            Objects: [
              {
                __classname__: "WWAsset",
                Type: "Image",
                Name: "web_" + meta.Object.Name,
                TargetName: "web_" + meta.Object.Name,
                AssetInfo: { OriginalFileName: meta.Object.Name },
                Category: meta.Object.Category,
                Publication: meta.Object.Publication,
                Format: meta.Object.Format,
                ...(meta.Object.Brand ? { Brand: meta.Object.Brand } : {}),
                ...(meta.Object.WorkflowStatus ? { WorkflowStatus: meta.Object.WorkflowStatus } : {}),
                Dossier: { ID: dossier.ID },
                UploadToken,
                ContentPath
              }
            ]
          };

          console.log("📨 CreateObjects payload:", JSON.stringify(payload, null, 2));

          const createRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=CreateObjects`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader },
            body: JSON.stringify(payload)
          });

          const rawCreate = await createRes.text();
          console.log("📥 CreateObjects raw response:", rawCreate);

          if (!rawCreate || rawCreate.trim().length === 0) {
            throw new Error(`CreateObjects returned empty body. HTTP status: ${createRes.status}`);
          }

          let createResult;
          try {
            createResult = JSON.parse(rawCreate);
          } catch (e) {
            throw new Error("CreateObjects response was not valid JSON");
          }

          const newId = createResult.Objects?.[0]?.Id;
          console.log("✅ Created duplicate image with ID:", newId);
        }

        ContentStationSdk.showNotification({ content: `✅ Duplicated ${selection.length} image(s) successfully.` });
      } catch (err) {
        console.error("❌ Failed to duplicate image(s):", err);
        ContentStationSdk.showNotification({ content: `❌ Failed to duplicate image(s). See console for details.` });
      }
    }
  });
})();
