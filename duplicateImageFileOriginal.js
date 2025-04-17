(function () {
  console.log("✅ A13 Plugin: Duplicate Original Image - Dossier Toolbar");

  function waitForContentStationSdk(callback) {
    if (typeof window.ContentStationSdk !== "undefined") {
      console.log("✅ ContentStationSdk is available");
      callback();
    } else {
      console.log("⏳ Waiting for ContentStationSdk...");
      setTimeout(() => waitForContentStationSdk(callback), 300);
    }
  }

  waitForContentStationSdk(function () {
    console.log("⏳ Registering dossier toolbar button...");

    ContentStationSdk.addDossierToolbarButton({
      id: "duplicate-original-image",
      label: "Duplicate Original Image",
      tooltip: "Duplicate version 1 of the selected image with a web_ prefix",
      icon: "content_copy",
      onClick: async () => {
        console.log("🟡 Duplicate button clicked — initiating handler");

        try {
          const selection = await ContentStationSdk.getCurrentSelection();
          console.log("📦 Selection:", selection);

          const selected = selection && selection[0];
          if (!selected || selected.objectType !== "Image") {
            alert("Please select a single image to duplicate.");
            return;
          }

          const objectId = selected.id;
          const ticket = await ContentStationSdk.getSessionTicket();
          const serverUrl = await ContentStationSdk.getStudioServerUrl();

          const metadataRes = await fetch(serverUrl + "/webservices/StudioServer.svc/GetObjectMetaData", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Ticket: ticket, ObjectId: objectId })
          });
          const meta = await metadataRes.json();

          const binaryRes = await fetch(serverUrl + "/webservices/StudioServer.svc/GetObjectBinary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Ticket: ticket, ObjectId: objectId, Version: 1 })
          });
          const buffer = await binaryRes.arrayBuffer();

          const blob = new Blob([buffer], { type: meta.Object.Format || "application/octet-stream" });
          const originalName = meta.Object.Name;
          const newName = "web_" + originalName;
          const file = new File([blob], newName, { type: blob.type });

          const form = new FormData();
          form.append("Ticket", ticket);
          form.append("File", file);

          const uploadRes = await fetch(serverUrl + "/webservices/StudioServer.svc/UploadFile", {
            method: "POST",
            body: form
          });
          const uploadJson = await uploadRes.json();

          const createRes = await fetch(serverUrl + "/webservices/StudioServer.svc/CreateObjects", {
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
                    ContentPath: uploadJson.Path
                  }
                }
              ]
            })
          });

          const createResult = await createRes.json();
          const newId = createResult.Objects && createResult.Objects[0] && createResult.Objects[0].Id;
          alert("✅ Created duplicate image with ID: " + newId);
        } catch (err) {
          console.error("❌ Failed to duplicate image:", err);
          alert("❌ Failed to duplicate image. See console for details.");
        }
      }
    });

    console.log("✅ DuplicateOriginalImage plugin: Button registered");
  });
})();
