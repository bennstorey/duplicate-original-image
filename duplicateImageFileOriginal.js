(function () {
  console.log("✅ 1 Plugin: Duplicate Original Image - Dossier Button");

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

    // Diagnostic fetches at plugin init
    const ticket = sessionInfo?.ticket;
    const serverUrl = sessionInfo?.studioServerUrl || `${location.origin}/server`;
    const diagHeaders = {
      "Content-Type": "application/json",
      ...(ticket ? {} : { "X-Requested-With": "XMLHttpRequest" })
    };
    const diagBody = JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}) });

    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetConfigInfo`, {
      method: "POST",
      headers: diagHeaders,
      body: diagBody,
      credentials: "include"
    })
      .then(async res => {
        console.log("🧪 GetConfigInfo status:", res.status);
        const text = await res.text();
        console.log("🧪 GetConfigInfo raw text:", text);
        try {
          const json = JSON.parse(text);
          console.log("🧩 GetConfigInfo JSON:", json);
        } catch (e) {
          console.warn("⚠️ GetConfigInfo failed to parse JSON:", e);
        }
      })
      .catch(err => console.warn("⚠️ GetConfigInfo request failed:", err));

    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`, {
      method: "POST",
      headers: diagHeaders,
      body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), Type: "Image" }),
      credentials: "include"
    })
      .then(async res => {
        console.log("🧪 GetObjectTemplate status:", res.status);
        const text = await res.text();
        console.log("🧪 GetObjectTemplate raw text:", text);
        try {
          const json = JSON.parse(text);
          console.log("🧱 GetObjectTemplate JSON:", json);
        } catch (e) {
          console.warn("⚠️ GetObjectTemplate failed to parse JSON:", e);
        }
      })
      .catch(err => console.warn("⚠️ GetObjectTemplate request failed:", err));

    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetMetaDataInfo`, {
      method: "POST",
      headers: diagHeaders,
      body: JSON.stringify({ ...(ticket ? { Ticket: ticket } : {}), ObjectType: "Image" }),
      credentials: "include"
    })
      .then(async res => {
        console.log("🧪 GetMetaDataInfo status:", res.status);
        const text = await res.text();
        console.log("🧪 GetMetaDataInfo raw text:", text);
        try {
          const json = JSON.parse(text);
          console.log("📘 GetMetaDataInfo JSON:", json);
        } catch (e) {
          console.warn("⚠️ GetMetaDataInfo failed to parse JSON:", e);
        }
      })
      .catch(err => console.warn("⚠️ GetMetaDataInfo request failed:", err));
  });

  // ... [rest of the plugin code remains unchanged]
})();
