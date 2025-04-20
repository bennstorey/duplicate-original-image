(function () {
  console.log("✅ B25 Plugin: Duplicate Original Image - Dossier Button");

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

      if (!serverUrl) {
        console.error("❌ Missing serverUrl in session info:", sessionInfo);
        ContentStationSdk.showNotification({
          content: "❌ Cannot duplicate image: missing server URL."
        });
        return;
      }

      try {
        // Fetch WorkflowInfo for additional required fields
        const workflowRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetWorkflowInfo`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" })
          },
          body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}) })
        });
        const workflowJson = await workflowRes.json();
        console.log("🧾 WorkflowInfo:", workflowJson);

        for (const selected of selection) {
          const objectId = selected.ID;

          const metadataRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectMetaData`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" })
            },
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectId: objectId })
          });

          const meta = await metadataRes.json();
          console.log("🧠 Fetched metadata:", meta);

          const binaryRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectBinary`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" })
            },
            body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectId: objectId, Version: 1 })
          });

          const buffer = await binaryRes.arrayBuffer();
          const blob = new Blob([buffer], { type: meta.Object.Format || "application/octet-stream" });
          console.log("📏 Blob size:", blob.size);
          const originalName = meta.Object.Name;
          const newName = "web_" + originalName;
          const file = new File([blob], newName, { type: blob.type });

          const form = new FormData();
          if (ticket) form.append("Ticket", ticket);
          form.append("File", file);

          const uploadRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=UploadFile`, {
            method: "POST",
            headers: {
              ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" })
            },
            body: form
          });

          const uploadText = await uploadRes.text();
          console.log("📤 UploadFile raw response text:", uploadText);
          if (!uploadText || uploadText.trim().length === 0) {
            throw new Error("UploadFile returned empty body");
          }

          let uploadJson;
          try {
            uploadJson = JSON.parse(uploadText);
            console.log("📤 Upload response JSON:", uploadJson);
          } catch (e) {
            console.error("❌ UploadFile response not valid JSON:", e);
            throw new Error("UploadFile did not return valid JSON");
          }

          const category = meta.Object.Category;
          const publication = meta.Object.Publication;
          const brand = meta.Object.Brand;
          const format = meta.Object.Format;
          const workflow = meta.Object.WorkflowStatus || workflowJson?.Workflow?.[0]?.WorkflowStatus?.[0]?.ID;

          if (!category) throw new Error("Missing Category in metadata for object ID: " + objectId);
          if (!publication) throw new Error("Missing Publication in metadata for object ID: " + objectId);
          if (!format) throw new Error("Missing Format in metadata for object ID: " + objectId);

          const payload = {
            ...(ticket ? { Ticket: ticket } : {}),
            Objects: [
              {
                __classname__: "WWAsset",
                ObjectType: "Image",
                Name: newName,
                Category: category,
                Publication: publication,
                Format: format,
                ...(brand ? { Brand: brand } : {}),
                ...(workflow ? { WorkflowStatus: workflow } : {}),
                Dossier: { ID: dossier.ID },
                ContentMetaData: {
                  ContentPath: uploadJson.Path
                }
              }
            ]
          };

          console.log("📨 CreateObjects payload:", JSON.stringify(payload, null, 2));

          const createRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=CreateObjects`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" })
            },
            body: JSON.stringify(payload)
          });

          console.log("🔎 CreateObjects HTTP status:", createRes.status, createRes.statusText);

          const rawCreateText = await createRes.text();
          console.log("📥 CreateObjects response text:", rawCreateText);

          if (!rawCreateText || rawCreateText.trim().length === 0) {
            throw new Error(`CreateObjects returned empty body. HTTP status: ${createRes.status}`);
          }

          let createResult;
          try {
            createResult = JSON.parse(rawCreateText);
          } catch (e) {
            console.error("❌ CreateObjects response not valid JSON:", e);
            throw new Error("CreateObjects did not return valid JSON");
          }

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
