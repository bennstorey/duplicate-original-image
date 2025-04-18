(function () {

  console.log("✅ A71 Plugin: Duplicate Original Image - Dossier Button");

const info = ContentStationSdk.getInfo();
console.log("🧾 getInfo() result:", info);


  ContentStationSdk.addDossierToolbarButton({
    label: "Duplicate Original Image(s)",
    onInit: (button, selection) => {
      button.isDisabled = !selection || selection.length === 0 || !selection.every(item => item.Type === "Image");
    },
    onAction: async (button, selection, dossier) => {
      console.log("🟡 Duplicate dossier button clicked — initiating handler");

      try {
        console.log("📦 Selection:", selection);
        console.log("📁 Dossier:", dossier);

        const info = ContentStationSdk.getInfo();
        const ticket = info?.session?.ticket;
        const serverUrl = info?.session?.studioServerUrl;

        if (!ticket || !serverUrl) {
          throw new Error("Missing serverUrl or ticket in session info.");
        }

        for (const selected of selection) {
          const objectId = selected.id;

          const metadataRes = await fetch(
            serverUrl + "/server/index.php?protocol=JSON&method=GetObjectMetaData",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ Ticket: ticket, ObjectId: objectId })
            }
          );

          if (!metadataRes.ok) {
            const errText = await metadataRes.text();
            throw new Error("Metadata request failed: " + errText);
          }

          const meta = await metadataRes.json();

          const binaryRes = await fetch(
            serverUrl + "/server/index.php?protocol=JSON&method=GetObjectBinary",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ Ticket: ticket, ObjectId: objectId, Version: 1 })
            }
          );

          if (!binaryRes.ok) {
            const errText = await binaryRes.text();
            throw new Error("Binary fetch failed: " + errText);
          }

          const buffer = await binaryRes.arrayBuffer();

          const blob = new Blob([buffer], { type: meta.Object.Format || "application/octet-stream" });
          const originalName = meta.Object.Name;
          const newName = "web_" + originalName;
          const file = new File([blob], newName, { type: blob.type });

          const form = new FormData();
          form.append("Ticket", ticket);
          form.append("File", file);

          const uploadRes = await fetch(
            serverUrl + "/server/index.php?protocol=JSON&method=UploadFile",
            {
              method: "POST",
              body: form
            }
          );

          if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            throw new Error("Upload failed: " + errText);
          }

          const uploadJson = await uploadRes.json();

          const createRes = await fetch(
            serverUrl + "/server/index.php?protocol=JSON&method=CreateObjects",
            {
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
            }
          );

          if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error("CreateObjects failed: " + errText);
          }

          const createResult = await createRes.json();
          const newId = createResult.Objects && createResult.Objects[0] && createResult.Objects[0].Id;
          console.log("✅ Created duplicate image with ID:", newId);
        }

        ContentStationSdk.showNotification({
          content: `✅ Duplicated ${selection.length} image(s) successfully.`
        });
      } catch (err) {
        console.error("❌ Failed to duplicate image(s):", err);
        ContentStationSdk.showNotification({
          content: `❌ Failed to duplicate one or more images. See console for details.`
        });
      }
    }
  });
})();
