(function () {
  console.log("🔎 E11 Diagnostic Plugin: Template and Metadata Test");

  let sessionInfo = null;

  ContentStationSdk.onSignin((info) => {
    console.log("🔑 Signin callback received:", info);
    sessionInfo = {
      ticket: '',
      studioServerUrl: info?.Url || `${location.origin}/server`
    };

    console.warn("⚠️ Ticket not present — using cookie-based auth");
    console.log("📡 Session Info:", sessionInfo);

    const serverUrl = sessionInfo.studioServerUrl;
    const headers = {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest"
    };
    const body = JSON.stringify({});

    // --- GetObjectTemplate ---
    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ Type: "Image" })
    })
      .then(async res => {
        console.log("🧱 GetObjectTemplate → HTTP", res.status, res.statusText);
        const raw = await res.text();
        console.log("🧱 Raw Template Response:", raw);
        try {
          const parsed = JSON.parse(raw);
          console.log("🧱 Parsed Template JSON:", parsed);
        } catch (e) {
          console.warn("⚠️ Failed to parse template JSON:", e);
        }
      })
      .catch(err => console.error("❌ GetObjectTemplate failed:", err));

    // --- GetMetaDataInfo ---
    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetMetaDataInfo`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ObjectType: "Image" })
    })
      .then(async res => {
        console.log("📘 GetMetaDataInfo → HTTP", res.status, res.statusText);
        const raw = await res.text();
        console.log("📘 Raw Metadata Response:", raw);
        try {
          const parsed = JSON.parse(raw);
          console.log("📘 Parsed Metadata JSON:", parsed);
        } catch (e) {
          console.warn("⚠️ Failed to parse metadata JSON:", e);
        }
      })
      .catch(err => console.error("❌ GetMetaDataInfo failed:", err));
  });
})();
