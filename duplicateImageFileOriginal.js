(function () {
  console.log("✅ A41 Plugin: Duplicate Original Image - Dossier Toolbar");

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
      label: "Duplicate Original Image",
      tooltip: "Duplicate version 1 of the selected image with a web_ prefix",
      icon: "content_copy",
      onAction: async function (config, selection, dossier) {
        console.log("🟡 Duplicate button clicked — initiating handler");

        try {
          console.log("📦 Selection:", selection);

          if (!selection || selection.length !== 1) {
            alert("Please select exactly one image.");
            return;
          }

          const selected = selection[0];
          if (selected.Type !== "Image") {
            alert("The selected item is not an image.");
            return;
          }

          const objectId = selected.id;
          const ticket = await ContentStationSdk.getTicket();
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
