(function () {
  console.log("🚀 Plugin E15: Dynamic CreateObjects Payload Builder with ObjectType override");

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

    ContentStationSdk.addDossierToolbarButton({
      label: "Dynamic Duplicate Image",
      id: "dynamic-duplicate-image-button",
      onInit: (button, selection) => {
        button.isDisabled = !selection || selection.length === 0 || !selection.every(item => item.Type === "Image");
      },
      onAction: async (button, selection, dossier) => {
        try {
          const objectId = selection[0].ID;

          const metaRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectMetaData`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ObjectId: objectId })
          });
          const metaJson = await metaRes.json();
          const original = metaJson?.Object;
          console.log("📦 Original metadata:", original);

          const binaryRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectBinary`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ObjectId: objectId, Version: 1 })
          });
          const buffer = await binaryRes.arrayBuffer();
          const blob = new Blob([buffer], { type: original.Format || 'application/octet-stream' });
          console.log("📏 Blob size:", blob.size);
          const file = new File([blob], `web_${original.Name}`, { type: blob.type });
          console.log("📝 File details:", file.name, file.type, file.size);

          const form = new FormData();
          form.append("File", file);

          console.log("📤 Uploading file to UploadFile...");
          const uploadRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=UploadFile`, {
            method: "POST",
            headers: {},
            body: form
          });

          console.log("📤 UploadFile → HTTP", uploadRes.status, uploadRes.statusText);
          console.log("📤 UploadFile response headers:", [...uploadRes.headers.entries()]);

          const rawUploadText = await uploadRes.text();
          console.log("📤 UploadFile raw response:", rawUploadText);

          if (!rawUploadText || rawUploadText.trim().length === 0) {
            throw new Error("UploadFile returned empty body");
          }

          let uploadJson;
          try {
            uploadJson = JSON.parse(rawUploadText);
            console.log("📤 UploadFile parsed JSON:", uploadJson);
          } catch (e) {
            console.error("❌ UploadFile response not valid JSON:", e);
            throw new Error("UploadFile did not return valid JSON");
          }

          const { UploadToken, ContentPath } = uploadJson;

          const templateRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
            method: "POST",
            headers,
            body: JSON.stringify({ Type: "Image" })
          });
          const templateText = await templateRes.text();
          console.log("🧱 GetObjectTemplate raw:", templateText);
          let templateJson;
          try {
            templateJson = JSON.parse(templateText);
            console.log("🧱 Template parsed JSON:", templateJson);
          } catch (e) {
            console.warn("⚠️ GetObjectTemplate not valid JSON", e);
          }

          const metadataRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetMetaDataInfo`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ObjectType: "Image" })
          });
          const metadataText = await metadataRes.text();
          console.log("📘 GetMetaDataInfo raw:", metadataText);
          try {
            const metadataJson = JSON.parse(metadataText);
            console.log("📘 GetMetaDataInfo parsed JSON:", metadataJson);
          } catch (e) {
            console.warn("⚠️ GetMetaDataInfo not valid JSON", e);
          }

          const templateFields = templateJson?.Objects?.[0] || {};
          const payloadObj = { ...templateFields };
          payloadObj.__classname__ = "WWAsset";
          payloadObj.Type = "Image";
          payloadObj.ObjectType = "Image";
          payloadObj.Name = `web_${original.Name}`;
          payloadObj.TargetName = `web_${original.Name}`;
          payloadObj.Dossier = { ID: dossier.ID };
          payloadObj.UploadToken = UploadToken;
          payloadObj.ContentPath = ContentPath;

          if (!payloadObj.Format && original.Format) payloadObj.Format = original.Format;
          if (!payloadObj.Category && original.Category) payloadObj.Category = original.Category;
          if (!payloadObj.Publication && original.Publication) payloadObj.Publication = original.Publication;
          if (!payloadObj.AssetInfo) payloadObj.AssetInfo = { OriginalFileName: original.Name };

          console.log("📨 Final CreateObjects payload:", payloadObj);

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
