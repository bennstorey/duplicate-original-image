(function () {
  console.log("✅ C21 Plugin: Diagnose Image Creation Requirements");

  let sessionInfo = null;

  ContentStationSdk.onSignin((info) => {
    console.log("🔑 Signin callback received:", info);
    sessionInfo = {
      ticket: '',
      studioServerUrl: info?.Url || `${location.origin}/server`
    };

    console.warn("⚠️ Ticket not present — testing cookie-based auth only");
    console.log("🔍 Parsed session info:", sessionInfo);

    const serverUrl = sessionInfo.studioServerUrl;
    const headers = {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest"
    };
    const body = JSON.stringify({});

    // --- GET SERVER INFO ---
    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetServerInfo`, {
      method: "POST",
      headers,
      body
    })
      .then(async res => {
        console.log("🔧 GetServerInfo → HTTP", res.status, res.statusText);
        const raw = await res.text();
        console.log("🔧 GetServerInfo raw response:", raw);
        if (!raw || raw.trim().length === 0) return;
        try {
          const parsed = JSON.parse(raw);
          console.log("🔧 GetServerInfo parsed JSON:", parsed);
        } catch (e) {
          console.warn("⚠️ GetServerInfo not valid JSON", e);
        }
      })
      .catch(err => console.warn("⚠️ GetServerInfo fetch failed:", err));

    // --- GET OBJECT TEMPLATE ---
    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ Type: "Image" })
    })
      .then(async res => {
        console.log("🧱 GetObjectTemplate (Image) → HTTP", res.status, res.statusText);
        const raw = await res.text();
        console.log("🧱 GetObjectTemplate raw:", raw);
        if (!raw || raw.trim().length === 0) return;
        try {
          const parsed = JSON.parse(raw);
          console.log("🧱 GetObjectTemplate parsed:", parsed);
        } catch (e) {
          console.warn("⚠️ GetObjectTemplate not valid JSON", e);
        }
      })
      .catch(err => console.warn("⚠️ GetObjectTemplate fetch failed:", err));

    // --- GET METADATA INFO ---
    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetMetaDataInfo`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ObjectType: "Image" })
    })
      .then(async res => {
        console.log("📘 GetMetaDataInfo (Image) → HTTP", res.status, res.statusText);
        const raw = await res.text();
        console.log("📘 GetMetaDataInfo raw:", raw);
        if (!raw || raw.trim().length === 0) return;
        try {
          const parsed = JSON.parse(raw);
          console.log("📘 GetMetaDataInfo parsed:", parsed);
        } catch (e) {
          console.warn("⚠️ GetMetaDataInfo not valid JSON", e);
        }
      })
      .catch(err => console.warn("⚠️ GetMetaDataInfo fetch failed:", err));
  });
})();
