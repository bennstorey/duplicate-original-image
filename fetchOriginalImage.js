(function () {
  console.log("✅ 4.7 Plugin: Duplicate Original Image - Using transferindex.php for upload (strict WW steps)");

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

          const getObjectRes = await fetch(`${serverUrl}/index.php?protocol=JSON`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              method: "GetObjects",
              id: "1",
              params: [
                {
                  Ticket: ticket,
                  IDs: [objectId],
                  Lock: false,
                  Rendition: "native",
                  RequestInfo: ["Pages", "Targets", "Files", "Relations"],
                  HaveVersions: [],
                  Areas: null,
                  EditionId: "",
                  SupportedContentSources: [],
                  __classname__: "WflGetObjectsRequest"
                }
              ],
              jsonrpc: "2.0"
            })
          });

          const getObjectJson = await getObjectRes.json();
          const meta = getObjectJson?.result?.Objects?.[0]?.MetaData;
          if (!meta) throw new Error("Missing metadata from GetObjects");

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
          const version01 = versionJson?.result?.Versions?.find(v => v.Version === "0.1");
          if (!version01?.File?.FileUrl) throw new Error("Version 0.1 FileUrl not found");

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

          const name = `web_${meta.BasicMetaData.Name}`;

          const publication = {
            Id: meta.BasicMetaData.Publication?.Id,
            Name: meta.BasicMetaData.Publication?.Name,
            __classname__: "Publication"
          };

          const category = {
            Id: meta.BasicMetaData.Category?.Id,
            Name: meta.BasicMetaData.Category?.Name,
            __classname__: "Category"
          };

          const payload = {
            method: "CreateObjects",
            id: "1",
            params: [
              {
                Ticket: ticket,
                RequestInfo: [""],
                Objects: [
                  {
                    __classname__: "WWAsset",
                    Type: "Image",
                    Name: name,
                    TargetName: name,
                    Dossier: { ID: dossier.ID },
                    ContentPath: fileGuid,
                    Format: meta.ContentMetaData.Format,
                    Category: category,
                    Publication: publication,
                    MetaData: {
                      __classname__: "MetaData",
                      BasicMetaData: {
                        __classname__: "BasicMetaData",
                        Name: name,
                        Type: "Image",
                        Format: meta.ContentMetaData.Format,
                        Publication: publication,
                        Category: category
                      }
                    }
                  }
                ]
              }
            ],
            jsonrpc: "2.0"
          };

          const createRes = await fetch(`${serverUrl}/index.php?protocol=JSON`, {
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
