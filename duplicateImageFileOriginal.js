(function () {
  console.log("✅ C14 Plugin: Duplicate Original Image - Dossier Button");

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

          const uploadJson = JSON.parse(uploadText);
          const { UploadToken, ContentPath } = uploadJson;
          if (!UploadToken || !ContentPath) {
            throw new Error("UploadFile missing UploadToken or ContentPath");
          }

          const category = meta.Object.Category;
          const publication = meta.Object.Publication;
          const brand = meta.Object.Brand;
          const format = meta.Object.Format;
          const workflow = meta.Object.WorkflowStatus || workflowJson?.Workflow?.[0]?.WorkflowStatus?.[0]?.ID;

          if (!category || !publication || !format) {
            throw new Error("Missing required metadata: Category, Publication or Format");
          }

          const payload = {
            ...(ticket ? { Ticket: ticket } : {}),
            Objects: [
              {
                __classname__: "WWAsset",
                Type: "Image",
                Name: newName,
                TargetName: newName,
                AssetInfo: {
                  OriginalFileName: originalName
                },
                Category: category,
                Publication: publication,
                Format: format,
                ...(brand ? { Brand: brand } : {}),
                ...(workflow ? { WorkflowStatus: workflow } : {}),
                Dossier: { ID: dossier.ID },
                UploadToken,
                ContentPath
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

          const rawCreateText = await createRes.text();
          console.log("📥 CreateObjects response text:", rawCreateText);

          if (!rawCreateText || rawCreateText.trim().length === 0) {
            throw new Error(`CreateObjects returned empty body. HTTP status: ${createRes.status}`);
          }

          const createResult = JSON.parse(rawCreateText);
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
