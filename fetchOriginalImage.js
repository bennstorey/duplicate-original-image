(function () {
  console.log("✅ 3.3 Plugin: Duplicate Original Image - ListVersions (corrected)");

  ContentStationSdk.onSignin((info) => {
    const serverUrl = info?.Url || `${location.origin}/server`;
    const ticket = info?.Ticket || "";
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

          // Step 1: ListVersions to get version 0.1 (version 1)
          const versionRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=ListVersions`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              Ticket: ticket,
              ID: objectId,
              Rendition: "native",
              Areas: ["Workflow"]
            })
          });

          const versionJson = await versionRes.json();
          const version01 = versionJson?.Versions?.find(v => v.Version === "0.1");
          if (!version01?.FileUrl) throw new Error("Version 0.1 not found in ListVersions result");

          const fileUrl = version01.FileUrl;
          const binaryRes = await fetch(fileUrl);
          const buffer = await binaryRes.arrayBuffer();
          const blob = new Blob([buffer], { type: 'application/octet-stream' });
          const file = new File([blob], `web_${selection[0].Name}`, { type: blob.type });

          const uploadResult = await window.entApi.callMethod("UploadFile", [{ Ticket: ticket }], file);
          if (!uploadResult?.UploadToken || !uploadResult?.ContentPath) {
            throw new Error("UploadFile response missing UploadToken or ContentPath");
          }
          console.log("📤 UploadFile result:", uploadResult);

          const payload = {
            Objects: [
              {
                __classname__: "WWAsset",
                Type: "Image",
                Name: `web_${selection[0].Name}`,
                TargetName: `web_${selection[0].Name}`,
                Dossier: { ID: dossier.ID },
                UploadToken: uploadResult.UploadToken,
                ContentPath: uploadResult.ContentPath,
                Format: "image/jpeg",
                Category: selection[0].Category,
                Publication: selection[0].Publication,
                AssetInfo: { OriginalFileName: selection[0].Name }
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
