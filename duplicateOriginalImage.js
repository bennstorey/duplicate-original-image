(function () {
  if (typeof ContentStationSdk !== "undefined") {
    console.log("✅ DuplicateOriginalImage plugin: ContentStationSdk is available");

    ContentStationSdk.addContextMenuItem({
      id: "duplicate-original-image",
      label: "Duplicate Original Image",
      icon: "content_copy",
      applicableTo: ["Image"],
      onClick: async function (object) {
        console.log("🔁 Context menu clicked for:", object);

        try {
          const ticket = await ContentStationSdk.session.getTicket();
          const serverUrl = await ContentStationSdk.session.getStudioServerUrl();
          const objectId = object.id;

          const fetchJson = async (endpoint, body) => {
            const res = await fetch(`${serverUrl}/webservices/StudioServer.svc/${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ Ticket: ticket, ...body })
            });
            return res.json();
          };

          const fetchBinary = async (endpoint, body) => {
            const res = await fetch(`${serverUrl}/webservices/StudioServer.svc/${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ Ticket: ticket, ...body })
            });
            return res.arrayBuffer();
          };

          const meta = await fetchJson('GetObjectMetaData', { ObjectId: objectId });
          const buffer = await fetchBinary('GetObjectBinary', { ObjectId: objectId, Version: 1 });

          const blob = new Blob([buffer], {
            type: meta.Object.Format || 'application/octet-stream'
          });

          const originalName = meta.Object.Name;
          const newName = originalName.replace(/\.(\w+)$/, '_web.$1');
          const file = new File([blob], newName, { type: blob.type });

          const form = new FormData();
          form.append('Ticket', ticket);
          form.append('File', file);

          const uploadRes = await fetch(`${serverUrl}/webservices/StudioServer.svc/UploadFile`, {
            method: 'POST',
            body: form
          });
          const uploadJson = await uploadRes.json();
          const contentPath = uploadJson.Path;

          const createResult = await fetchJson('CreateObjects', {
            Objects: [{
              __classname__: 'com.woodwing.assets.server.object.Asset',
              Name: newName,
              Category: meta.Object.Category,
              Dossier: meta.Object.Dossier,
              ContentMetaData: {
                ContentPath: contentPath
              }
            }]
          });

          const newId = createResult.Objects[0].Id;
          alert(`✅ Created new object: ${newId}`);
        } catch (err) {
          console.error("❌ Error in DuplicateOriginalImage plugin:", err);
          alert("❌ Failed to duplicate original image. See console for details.");
        }
      }
    });

    console.log("✅ DuplicateOriginalImage plugin: context menu registered");
  } else {
    console.error("❌ DuplicateOriginalImage plugin: ContentStationSdk is NOT available");
  }
})();
