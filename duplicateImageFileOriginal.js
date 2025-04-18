(function () {
  console.log("✅ A76 Plugin: Duplicate Original Image - Dossier Button");

  let sessionInfo = null;

  ContentStationSdk.onSignin((info) => {
    console.log("🔑 Signin callback received:", info);
    sessionInfo = {
      ticket: info?.session?.ticket,
      serverUrl: info?.session?.studioServerUrl
    };
  });

  ContentStationSdk.addDossierToolbarButton({
    label: "Duplicate Original Image(s)",
    onInit: (button, selection) => {
      button.isDisabled = !selection || selection.length === 0 || !selection.every(item => item.Type === "Image");
    },
    onAction: async (button, selection, dossier) => {
      console.log("🟡 Duplicate dossier button clicked — initiating handler");
      console.log("📦 Selection:", selection);
      console.log("📁 Dossier:", dossier);

      const { ticket, serverUrl } = sessionInfo || {};

      if (!ticket || !serverUrl) {
        console.error("❌ Missing serverUrl or ticket in session info.");
        ContentStationSdk.showNotification({
          content: "❌ Cannot duplicate image: missing session info. Please sign out and sign in again."
        });
        return;
      }

      try {
        for (const selected of selection) {
          const objectId = selected.id;

          const metadataRes = await fetch(
            `${serverUrl}/server/index.php?protocol=JSON&method=GetObjectMetaData`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ Ticket: ticket, ObjectId: objectId })
            }
          );

          const meta = await metadataRes.json();

          const binaryRes = await fetch(
            `${serverUrl}/server/index.php?protocol=JSON&method=GetObjectBinary`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ Ticket: ticket, ObjectId: objectId, Version: 1 })
            }
          );

          const buffer = await binaryRes.arrayBuffer();
          const blob = new Blob([buffer], { type: meta.Object.Format || "application/octet-stream" });
          const originalName = meta.Object.Name;
          const newName = "web_" + originalName;
          const file = new File([blob], newName, { type: blob.type });

          const form = new FormData();
          form.append("Ticket", ticket);
          form.append("File", file);

          const uploadRes = await fetch(
            `${serverUrl}/server/index.php?protocol=JSON&method=UploadFile`,
            {
              method: "POST",
              body: form
            }
          );

          const uploadJson = await uploadRes.json();

          const createRes = await fetch(
            `${serverUrl}/server/index.php?protocol=JSON&method=CreateObjects`,
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
                    Dossier: dossier.ID,
                    ContentMetaData: {
                      ContentPath: uploadJson.Path
                    }
                  }
                ]
              })
            }
          );

          const createResult = await createRes.json();
          const newId = createResult.Objects?.[0]?.Id;
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
