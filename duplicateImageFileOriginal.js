(function () {
  console.log("✅ C8 Plugin: Duplicate Original Image - Dossier Button");

let sessionInfo = null;

ContentStationSdk.onSignin((info) => {
console.log("🔑 Signin callback received:", info);
if (info && typeof info === "object") {
sessionInfo = {
ticket: info.Ticket || '',
studioServerUrl: info.Url || `${location.origin}/server`
};
}
if (!sessionInfo?.ticket) {
console.warn("⚠️ Ticket not present — using cookie-based auth");
}
console.log("🔍 Parsed session info:", sessionInfo);

    const ticket = sessionInfo?.ticket;
    const serverUrl = sessionInfo?.studioServerUrl || `${location.origin}/server`;
    const diagHeaders = {
      "Content-Type": "application/json",
      ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" })
    };
    const diagBody = JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}) });

    // Extended diagnostics to verify required fields
    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetConfigInfo`, {
      method: "POST",
      headers: diagHeaders,
      body: diagBody
    })
      .then(res => res.text())
      .then(txt => {
        console.log("🧩 GetConfigInfo text:", txt);
        try { console.log("🧩 GetConfigInfo JSON:", JSON.parse(txt)); } catch (e) { console.warn("⚠️ Invalid JSON"); }
      })
      .catch(err => console.warn("⚠️ GetConfigInfo failed:", err));

    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
      method: "POST",
      headers: diagHeaders,
      body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), Type: "Image" })
    })
      .then(res => res.text())
      .then(txt => {
        console.log("🧱 GetObjectTemplate (Image) text:", txt);
        try { console.log("🧱 GetObjectTemplate JSON:", JSON.parse(txt)); } catch (e) { console.warn("⚠️ Invalid JSON"); }
      })
      .catch(err => console.warn("⚠️ GetObjectTemplate failed:", err));

    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetMetaDataInfo`, {
      method: "POST",
      headers: diagHeaders,
      body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectType: "Image" })
    })
      .then(res => res.text())
      .then(txt => {
        console.log("📘 GetMetaDataInfo (Image) text:", txt);
        try { console.log("📘 GetMetaDataInfo JSON:", JSON.parse(txt)); } catch (e) { console.warn("⚠️ Invalid JSON"); }
      })
      .catch(err => console.warn("⚠️ GetMetaDataInfo failed:", err));

    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectInfo`, {
      method: "POST",
      headers: diagHeaders,
      body: diagBody
    })
      .then(res => res.text())
      .then(txt => {
        console.log("🧮 GetObjectInfo text:", txt);
        try { console.log("🧮 GetObjectInfo JSON:", JSON.parse(txt)); } catch (e) { console.warn("⚠️ Invalid JSON"); }
      })
      .catch(err => console.warn("⚠️ GetObjectInfo failed:", err));
});

// Button registration and duplication flow remain unchanged

ContentStationSdk.addDossierToolbarButton({
label: "Duplicate Original Image(s)",
id: "duplicate-original-image-button",
onInit: (button, selection) => {
button.isDisabled = !selection || selection.length === 0 || !selection.every(item => item.Type === "Image");
},
onAction: async (button, selection, dossier) => {
// [ ... existing duplication logic ... ]
}
});
})();
