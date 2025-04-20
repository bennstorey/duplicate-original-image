(function () {
  console.log("✅ C15 Plugin: Duplicate Original Image - Dossier Button");

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
      console.log(`📤 Sending ${label}:\`, fullPayload);

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
            return;
          }

          try {
            const parsed = JSON.parse(raw);
            console.log(`${label} parsed JSON:`, parsed);
          } catch (e) {
            console.warn(`⚠️ ${label} response not valid JSON`, e);
          }
        })
        .catch(err => {
          console.warn(`⚠️ ${label} fetch failed:`, err);
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

      if (!sessionInfo) {
        sessionInfo = ContentStationSdk.getInfo();
        if (!sessionInfo.studioServerUrl) {
          sessionInfo.studioServerUrl = `${location.origin}/server`;
        }
      }

      const ticket = sessionInfo.ticket;
      const serverUrl = sessionInfo.studioServerUrl;

      for (const selected of selection) {
        try {
          const objectId = selected.ID;

          const [metaRes, binaryRes, templateRes] = await Promise.all([
            fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectMetaData`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" }) },
              body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectId: objectId })
            }).then(res => res.json()),

            fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectBinary`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" }) },
              body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectId: objectId, Version: 1 })
            }).then(res => res.arrayBuffer()),

            fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" }) },
              body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), Type: "Image" })
            }).then(res => res.json())
          ]);

          const blob = new Blob([binaryRes], { type: metaRes.Object.Format || "application/octet-stream" });
          const originalName = metaRes.Object.Name;
          const newName = "web_" + originalName;
          const file = new File([blob], newName, { type: blob.type });

          const form = new FormData();
          if (ticket) form.append("Ticket", ticket);
          form.append("File", file);

          const uploadRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=UploadFile`, {
            method: "POST",
            headers: { ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" }) },
            body: form
          });

          const uploadText = await uploadRes.text();
          const uploadJson = JSON.parse(uploadText);
          const { UploadToken, ContentPath } = uploadJson;

          const baseObject = templateRes.Object || {};

          const newObject = {
            ...baseObject,
            __classname__: "WWAsset",
            Type: "Image",
            Name: newName,
            TargetName: newName,
            AssetInfo: { OriginalFileName: originalName },
            Category: metaRes.Object.Category,
            Publication: metaRes.Object.Publication,
            Format: metaRes.Object.Format,
            ...(metaRes.Object.Brand ? { Brand: metaRes.Object.Brand } : {}),
            ...(metaRes.Object.WorkflowStatus ? { WorkflowStatus: metaRes.Object.WorkflowStatus } : {}),
            Dossier: { ID: dossier.ID },
            UploadToken,
            ContentPath
          };

          const payload = {
            ...(ticket ? { Ticket: ticket } : {}),
            Objects: [newObject]
          };

          console.log("📨 Final CreateObjects payload:", JSON.stringify(payload, null, 2));

          const createRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=CreateObjects`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" }) },
            body: JSON.stringify(payload)
          });

          const createText = await createRes.text();
          console.log("📥 CreateObjects response text:", createText);

          if (!createText || createText.trim().length === 0) {
            throw new Error("CreateObjects returned empty body");
          }

          const createResult = JSON.parse(createText);
          const newId = createResult.Objects?.[0]?.Id;
          console.log("✅ Created duplicate image with ID:", newId);
        } catch (err) {
          console.error("❌ Error during image duplication:", err);
          ContentStationSdk.showNotification({
            content: `❌ Duplication failed for one or more images. See console for details.`
          });
        }
      }
    }
  });
})();
