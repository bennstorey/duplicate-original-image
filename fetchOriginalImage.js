(function () {
  console.log("✅ E28 Plugin: Duplicate Original Image - Full WW Flow");

  ContentStationSdk.onSignin((info) => {
    const serverUrl = info?.Url || `${location.origin}/server`;
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

          // Step: ListVersions to get version 0.1
          const listVersionsRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=ListVersions`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ObjectId: objectId })
          });
          const versionsJson = await listVersionsRes.json();
          const version01 = versionsJson?.Versions?.find(v => v.Version === "0.1");
          if (!version01?.FileUrl) throw new Error("Version 0.1 not found in ListVersions result");

          // Step: Download original binary from version 0.1
          const binaryRes = await fetch(version01.FileUrl);
          const buffer = await binaryRes.arrayBuffer();
          const blob = new Blob([buffer], { type: original.Format || 'application/octet-stream' });
          const file = new File([blob], `web_${original.Name}`, { type: blob.type });

          const uploadResult = await window.entApi.callMethod("UploadFile", [{ Ticket: "" }], file);
          if (!uploadResult?.UploadToken || !uploadResult?.ContentPath) {
            throw new Error("UploadFile response missing UploadToken or ContentPath");
          }
          console.log("📤 UploadFile result:", uploadResult);

          const payload = {
            Objects: [
              {
                __classname__: "WWAsset",
                Type: "Image",
                Name: `web_${original.Name}`,
                TargetName: `web_${original.Name}`,
                Dossier: { ID: dossier.ID },
                UploadToken: uploadResult.UploadToken,
                ContentPath: uploadResult.ContentPath,
                Format: original.Format,
                Category: original.Category,
                Publication: original.Publication,
                AssetInfo: { OriginalFileName: original.Name }
              }
            ]
          };

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
