(function () {
  console.log("✅ 010 DuplicateOriginalImage plugin: starting");

  function waitForContentStationSdk(callback) {
    if (typeof ContentStationSdk !== "undefined") {
      console.log("✅ DuplicateOriginalImage plugin: ContentStationSdk is available");
      callback();
    } else {
      console.log("⏳ Waiting for ContentStationSdk...");
      setTimeout(() => waitForContentStationSdk(callback), 500);
    }
  }

  waitForContentStationSdk(() => {
    console.log("⏳ Registering DuplicateOriginalImage plugin");

    ContentStationSdk.registerPlugin({
      initialize: (api) => {
        console.log("✅ DuplicateOriginalImage plugin: Initialized");

        api.addDossierToolbarButton({
          id: "duplicate-original-image",
          label: "Duplicate Original",
          tooltip: "Duplicate the original version of the selected image",
          icon: "content_copy",
          onClick: async (context) => {
            console.log("🟡 Duplicate button clicked");

            try {
              const selection = await api.getCurrentSelection();
              console.log("🟢 Selection:", selection);
              const selected = selection?.[0];

              if (!selected || selected.objectType !== "Image") {
                alert("Please select a single image to duplicate.");
                return;
              }

              const objectId = selected.id;
              const ticket = await api.getSessionTicket();
              const serverUrl = await api.getStudioServerUrl();

              const fetchJson = async (endpoint, body) => {
                const res = await fetch(`${serverUrl}/webservices/StudioServer.svc/${endpoint}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ Ticket: ticket, ...body })
                });
                return res.json();
              };

              const fetchBinary = async (endpoint, body) => {
                const res = await fetch(`${serverUrl}/webservices/StudioServer.svc/${endpoint}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ Ticket: ticket, ...body })
                });
                return res.arrayBuffer();
              };

              const meta = await fetchJson("GetObjectMetaData", { ObjectId: objectId });
              const buffer = await fetchBinary("GetObjectBinary", { ObjectId: objectId, Version: 1 });

              const blob = new Blob([buffer], { type: meta.Object.Format || "application/octet-stream" });
              const originalName = meta.Object.Name;
              const newName = originalName.replace(/\.(\w+)$/, "_copy.$1");
              const file = new File([blob], newName, { type: blob.type });

              const form = new FormData();
              form.append("Ticket", ticket);
              form.append("File", file);

              const uploadRes = await fetch(`${serverUrl}/webservices/StudioServer.svc/UploadFile`, {
                method: "POST",
                body: form
              });

              const uploadJson = await uploadRes.json();
              const contentPath = uploadJson.Path;

              const createResult = await fetchJson("CreateObjects", {
                Objects: [{
                  __classname__: "com.woodwing.assets.server.object.Asset",
                  Name: newName,
                  Category: meta.Object.Category,
                  Dossier: meta.Object.Dossier,
                  ContentMetaData: {
                    ContentPath: contentPath
                  }
                }]
              });

              const newId = createResult.Objects?.[0]?.Id;
              alert("✅ Created duplicate image with ID: " + newId);
            } catch (err) {
              console.error("❌ Failed to duplicate image:", err);
              alert("❌ Failed to duplicate image. See console for details.");
            }
          }
        });

        console.log("✅ DuplicateOriginalImage plugin: Button registered");
      }
    });
  });
})();
