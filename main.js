import { Studio } from "https://cdn.jsdelivr.net/npm/@woodwing/studio-sdk/+esm";

Studio.onReady(() => {
  document.getElementById("duplicate-button").addEventListener("click", async () => {
    const selection = await Studio.selection.getSelectedObjects();
    if (!selection.length || selection[0].type !== "Image") {
      alert("Please select a single image.");
      return;
    }

    const ticket = await Studio.session.getTicket();
    const serverUrl = await Studio.session.getStudioServerUrl();
    const objectId = selection[0].id;

    const getJson = async (endpoint, body) => {
      const res = await fetch(`${serverUrl}/webservices/StudioServer.svc/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Ticket: ticket, ...body })
      });
      return res.json();
    };

    const postBinary = async (endpoint, body) => {
      const res = await fetch(`${serverUrl}/webservices/StudioServer.svc/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Ticket: ticket, ...body })
      });
      return res.arrayBuffer();
    };

    try {
      const meta = await getJson("GetObjectMetaData", { ObjectId: objectId });
      const buffer = await postBinary("GetObjectBinary", { ObjectId: objectId, Version: 1 });
      const blob = new Blob([buffer], { type: meta.Object.Format || "application/octet-stream" });

      const file = new File([blob], meta.Object.Name, { type: blob.type });
      const form = new FormData();
      form.append("Ticket", ticket);
      form.append("File", file);

      const uploadRes = await fetch(`${serverUrl}/webservices/StudioServer.svc/UploadFile`, {
        method: "POST",
        body: form
      });
      const uploadJson = await uploadRes.json();
      const contentPath = uploadJson.Path;

    //   const name = meta.Object.Name.replace(/\.(\w+)$/, `_original.$1`);
    const name = meta.Object.Name.replace(/\.(\w+)$/, `_web.$1`);
      const createRes = await getJson("CreateObjects", {
        Objects: [{
          __classname__: "com.woodwing.assets.server.object.Asset",
          Name: name,
          Category: meta.Object.Category,
          Dossier: meta.Object.Dossier,
          ContentMetaData: {
            ContentPath: contentPath
          }
        }]
      });

      alert(`✅ Created: ${createRes.Objects[0].Id}`);
    } catch (err) {
      console.error("❌ Error:", err);
      alert("Error duplicating original version. See console for details.");
    }
  });
});
