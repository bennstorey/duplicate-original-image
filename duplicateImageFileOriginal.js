(function () {
  console.log("✅ E35 Plugin: Duplicate Original Image - Upload Debug Enhancements");

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

          const [metaRes, templateRes] = await Promise.all([
            fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectMetaData`, {
              method: "POST",
              headers,
              body: JSON.stringify({ ObjectId: objectId })
            }),
            fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
              method: "POST",
              headers,
              body: JSON.stringify({ Type: "Image" })
            })
          ]);

          const metaJson = await metaRes.json();
          const templateJson = await templateRes.json();
          const original = metaJson?.Object;
          const template = templateJson?.ObjectTemplate?.Objects?.[0] || {};

          console.log("📦 Original metadata:", original);
          console.log("🧱 Template metadata:", template);

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
          if (sessionInfo.ticket) form.append("Ticket", sessionInfo.ticket);

          const uploadRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=UploadFile`, {
            method: "POST",
            headers: {},
            body: form
          });

          const rawUploadText = await uploadRes.text();
          console.log("📤 UploadFile raw text:", rawUploadText);

          const uploadJson = JSON.parse(rawUploadText);
          const { UploadToken, ContentPath } = uploadJson;

          console.log("📎 UploadToken:", UploadToken);
          console.log("📎 ContentPath:", ContentPath);

          const payload = {
            Ticket: sessionInfo.ticket,
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
                Category: original.Category || template.Category,
                Publication: original.Publication || template.Publication,
                Brand: original.Brand || template.Brand || '',
                WorkflowStatus: original.WorkflowStatus || template.WorkflowStatus || '',
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
          console.log("📥 CreateObjects response:", rawCreateText);

          const createResult = JSON.parse(rawCreateText);
          console.log("✅ Created object:", createResult);

          ContentStationSdk.showNotification({ content: "✅ Image duplicated successfully." });

        } catch (err) {
          console.error("❌ Duplication flow failed:", err);
          ContentStationSdk.showNotification({ content: "❌ Duplication failed. Check console." });
        }
      }
    });
  });
})();
