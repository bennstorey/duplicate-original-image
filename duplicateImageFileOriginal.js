(function () {
  console.log("✅ E29 Plugin: Duplicate Original Image - Clean Version with Diagnostics");

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
      label: "Duplicate Image(s)",
      id: "duplicate-image-button",
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
          const file = new File([blob], `web_${original.Name}`, { type: blob.type });

          const form = new FormData();
          form.append("File", file);

          const uploadRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=UploadFile`, {
            method: "POST",
            headers: {},
            body: form
          });

          const rawUploadText = await uploadRes.text();
          if (!rawUploadText || rawUploadText.trim().length === 0) {
            throw new Error("UploadFile returned empty body");
          }

          const uploadJson = JSON.parse(rawUploadText);
          const { UploadToken, ContentPath } = uploadJson;

          // 🧱 Diagnostic call: GetObjectTemplate
          const templateRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
            method: "POST",
            headers,
            body: JSON.stringify({ Type: "Image" })
          });
          const templateRaw = await templateRes.text();
          console.log("🧱 GetObjectTemplate raw response:", templateRaw);
          let templateJson;
          try {
            templateJson = JSON.parse(templateRaw);
          } catch (e) {
            console.warn("⚠️ Failed to parse GetObjectTemplate JSON:", e);
          }

          const payload = {
            Objects: [
              {
                __classname__: "WWAsset",
                Type: "Image",
                Name: `web_${original.Name}`,
                TargetName: `web_${original.Name}`,
                Dossier: { ID: dossier.ID },
                UploadToken,
                ContentPath,
                Format: original.Format,
                Category: original.Category,
                Publication: original.Publication,
                AssetInfo: { OriginalFileName: original.Name }
              }
            ]
          };

          console.log("📨 Final CreateObjects payload:", JSON.stringify(payload, null, 2));

          const createRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=CreateObjects`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
          });

          const rawCreateText = await createRes.text();
          if (!rawCreateText || rawCreateText.trim().length === 0) {
            throw new Error(`CreateObjects returned empty body. HTTP ${createRes.status} ${createRes.statusText}`);
          }

          const createResult = JSON.parse(rawCreateText);
          console.log("✅ Created object:", createResult);
          ContentStationSdk.showNotification({ content: "✅ Image duplicated successfully." });

        } catch (err) {
          console.error("❌ Error during duplication flow:", err);
          ContentStationSdk.showNotification({ content: "❌ Image duplication failed. Check console." });
        }
      }
    });
  });
})();
