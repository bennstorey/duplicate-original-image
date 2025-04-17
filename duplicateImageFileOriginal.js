(function () {
  const logPrefix = "🔁 [DuplicateImagePlugin]";
  console.log(`${logPrefix} ✅ Initialized`);

  function waitForContentStationSdk(callback) {
    if (typeof window.ContentStationSdk !== "undefined") {
      console.log(`${logPrefix} ✅ ContentStationSdk available`);
      callback();
    } else {
      console.log(`${logPrefix} ⏳ Waiting for ContentStationSdk...`);
      setTimeout(() => waitForContentStationSdk(callback), 300);
    }
  }

  waitForContentStationSdk(function () {
    console.log(`${logPrefix} ⏳ Registering dossier toolbar button...`);

    ContentStationSdk.addDossierToolbarButton({
      id: "duplicate-original-image",
      label: "Duplicate Original Image",
      tooltip: "Duplicate version 1 of the selected image with a web_ prefix",
      icon: "content_copy",
      onClick: async function () {
        console.log(`${logPrefix} 🟡 Button clicked`);

        try {
          const selection = await ContentStationSdk.getSelection();
          console.log(`${logPrefix} 📦 Selection:`, selection);

          const selected = selection && selection[0];
          if (!selected || selected.objectType !== "Image") {
            alert("Please select a single image to duplicate.");
            return;
          }

          const objectId = selected.id;
          const ticket = await ContentStationSdk.getSessionTicket();
          const serverUrl = await ContentStationSdk.getStudioServerUrl();

          const metaResp = await fetch(`${serverUrl}/webservices/StudioServer.svc/GetObjectMetaData`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Ticket: ticket, ObjectId: objectId })
          });
          const meta = await metaResp.json();

          const binaryResp = await fetch(`${serverUrl}/webservices/StudioServer.svc/GetObjectBinary`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Ticket: ticket, ObjectId: objectId, Version: 1 })
          });
          const buffer = await binaryResp.arrayBuffer();

          const blob = new Blob([buffer], { type: meta.Object.Format || "application/octet-stream" });
          const newName = "web_" + meta.Object.Name;
          const file = new File([blob], newName, { type: blob.type });

          const formData = new FormData();
          formData.append("Ticket", ticket);
          formData.append("File", file);

          const uploadResp = await fetch(`${serverUrl}/webservices/StudioServer.svc/UploadFile`, {
            method: "POST",
            body: formData
          });
          const uploadData = await uploadResp.json();

          const createResp = await fetch(`${serverUrl}/webservices/StudioServer.svc/CreateObjects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Ticket: ticket,
              Objects: [
                {
                  __classname__: "com.woodwing.assets.server.object.Asset",
                  Name: newName,
                  Category: meta.Object.Category,
                  Dossier: meta.Object.Dossier,
                  ContentMetaData: {
                    ContentPath: uploadData.Path
                  }
                }
              ]
            })
          });

          const created = await createResp.json();
          const newId = created.Objects?.[0]?.Id;
          alert(`${logPrefix} ✅ Created duplicate image with ID: ${newId}`);
        } catch (err) {
          console.error(`${logPrefix} ❌ Error during duplication`, err);
          alert(`${logPrefix} ❌ Failed to duplicate image. See console.`);
        }
      }
    });

    console.log(`${logPrefix} ✅ Toolbar button registered`);
  });
})();
