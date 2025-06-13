(function () {
  console.log("✅ 4.0 Plugin: Duplicate Original Image - Using transferindex.php for upload");

  ContentStationSdk.onSignin((info) => {
    const serverUrl = info?.Url || `${location.origin}/server`;
    const headers = {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest"
    };

    const logOn = async () => {
      const username = prompt("Studio API username");
      const password = prompt("Studio API password");

      const res = await fetch(`${serverUrl}/index.php?protocol=JSON`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          method: "LogOn",
          id: "1",
          Params: {
            req: {
              User: username,
              Password: password,
              ClientName: "plugin",
              ClientAppName: "duplicate_original_image",
              ClientAppVersion: "1.0",
              ClientAppSerial: "",
              RequestInfo: [""],
              __classname__: "WflLogOnRequest"
            }
          },
          jsonrpc: "2.0"
        })
      });

      const json = await res.json();
      console.log("🔐 LogOn response:", json);
      if (!json?.result?.Ticket) throw new Error("LogOn failed: no ticket returned");
      return json.result.Ticket;
    };

    ContentStationSdk.addDossierToolbarButton({
      label: "Duplicate Image(s)",
      id: "duplicate-image-button",
      onInit: (button, selection) => {
        button.isDisabled = !selection || selection.length === 0 || !selection.every(item => item.Type === "Image");
      },
      onAction: async (button, selection, dossier) => {
        try {
          const ticket = await logOn();
          const objectId = selection[0].ID;

          // Step 1: ListVersions to get version 0.1 (version 1)
          const versionRes = await fetch(`${serverUrl}/index.php?protocol=JSON`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              method: "ListVersions",
              id: "1",
              params: [
                {
                  Ticket: ticket,
                  ID: objectId,
                  Rendition: "native"
                }
              ],
              jsonrpc: "2.0"
            })
          });

          const versionJson = await versionRes.json();
          console.log("📄 Raw ListVersions response:", versionJson);
          const versions = versionJson?.result?.Versions || [];
          const version01 = versions.find(v => v.Version === "0.1");
          if (!version01?.File?.FileUrl) throw new Error("Version 0.1 not found or missing FileUrl");

          const fileUrl = version01.File.FileUrl;
          const binaryRes = await fetch(fileUrl);
          const buffer = await binaryRes.arrayBuffer();
          const blob = new Blob([buffer], { type: 'application/octet-stream' });

          const fileGuid = crypto.randomUUID();
          const uploadUrl = `${serverUrl}/transferindex.php?fileguid=${fileGuid}&ticket=${ticket}`;

          const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "x-ww-transfermode": "raw"
            },
            body: blob
          });

          if (!putRes.ok) throw new Error(`PUT failed: HTTP ${putRes.status}`);
          console.log("📤 PUT upload succeeded:", fileGuid);

          const payload = {
            Objects: [
              {
                __classname__: "WWAsset",
                Type: "Image",
                Name: `web_${selection[0].Name}`,
                TargetName: `web_${selection[0].Name}`,
                Dossier: { ID: dossier.ID },
                ContentPath: fileGuid,
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
