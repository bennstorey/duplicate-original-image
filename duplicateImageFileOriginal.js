(function () {
  console.log("🚀 Plugin E12: Dynamic CreateObjects Payload Builder");

  let sessionInfo = null;

  ContentStationSdk.onSignin((info) => {
    console.log("🔑 Signin callback received:", info);
    sessionInfo = {
      ticket: '',
      studioServerUrl: info?.Url || `${location.origin}/server`
    };

    console.warn("⚠️ Ticket not present — using cookie-based auth");
    console.log("📡 Session Info:", sessionInfo);

    const serverUrl = sessionInfo.studioServerUrl;
    const headers = {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest"
    };

    // --- Create a toolbar button ---
    ContentStationSdk.addDossierToolbarButton({
      label: "Dynamic Duplicate Image",
      id: "dynamic-duplicate-image-button",
      onInit: (button, selection) => {
        button.isDisabled = !selection || selection.length === 0 || !selection.every(item => item.Type === "Image");
      },
      onAction: async (button, selection, dossier) => {
        try {
          const objectId = selection[0].ID;

          // --- Fetch metadata ---
          const metaRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectMetaData`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ObjectId: objectId })
          });
          const metaJson = await metaRes.json();
          const original = metaJson?.Object;
          console.log("📦 Original metadata:", original);

          // --- Fetch version 1 binary ---
          const binaryRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectBinary`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ObjectId: objectId, Version: 1 })
          });
          const blob = new Blob([await binaryRes.arrayBuffer()], { type: original.Format || 'application/octet-stream' });
          const file = new File([blob], `web_${original.Name}`, { type: blob.type });

          // --- Upload file ---
          const form = new FormData();
          form.append("File", file);

          const uploadRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=UploadFile`, {
            method: "POST",
            headers: {},
            body: form
          });
          const uploadJson = await uploadRes.json();
          console.log("📤 Upload response:", uploadJson);

          const { UploadToken, ContentPath } = uploadJson;

          // --- Fetch object template ---
          const templateRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
            method: "POST",
            headers,
            body: JSON.stringify({ Type: "Image" })
          });
          const templateJson = await templateRes.json();
          const templateFields = templateJson?.Objects?.[0] || {};
          console.log("🧱 Template fields:", templateFields);

          // --- Build dynamic object ---
          const payloadObj = { ...templateFields };
          payloadObj.__classname__ = "WWAsset";
          payloadObj.Type = "Image";
          payloadObj.Name = `web_${original.Name}`;
          payloadObj.TargetName = `web_${original.Name}`;
          payloadObj.Dossier = { ID: dossier.ID };
          payloadObj.UploadToken = UploadToken;
          payloadObj.ContentPath = ContentPath;

          // Patch in required known fields if missing
          if (!payloadObj.Format && original.Format) payloadObj.Format = original.Format;
          if (!payloadObj.Category && original.Category) payloadObj.Category = original.Category;
          if (!payloadObj.Publication && original.Publication) payloadObj.Publication = original.Publication;
          if (!payloadObj.AssetInfo) payloadObj.AssetInfo = { OriginalFileName: original.Name };

          console.log("📨 Final CreateObjects payload:", payloadObj);

          // --- Send CreateObjects ---
          const createRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=CreateObjects`, {
            method: "POST",
            headers,
            body: JSON.stringify({ Objects: [payloadObj] })
          });
          const rawCreateText = await createRes.text();
          console.log("📥 CreateObjects raw response:", rawCreateText);

          let createResult;
          try {
            createResult = JSON.parse(rawCreateText);
            console.log("✅ Created object:", createResult);
            ContentStationSdk.showNotification({ content: "✅ Image duplicated successfully." });
          } catch (e) {
            console.error("❌ Failed to parse CreateObjects result:", e);
            ContentStationSdk.showNotification({ content: "❌ Failed to create object. See console." });
          }
        } catch (err) {
          console.error("❌ Error during duplication flow:", err);
          ContentStationSdk.showNotification({ content: "❌ Image duplication failed. Check console." });
        }
      }
    });
  });
})();
