(function () {
  console.log("✅ C20 Plugin: Cookie Auth Test - Dossier Button");

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

    console.log("📤 Sending 🔧 GetServerInfo", body);

    fetch(`${serverUrl}/index.php?protocol=JSON&method=GetServerInfo`, {
      method: "POST",
      headers,
      body
    })
      .then(async res => {
        console.log("🔧 GetServerInfo → HTTP", res.status, res.statusText);
        const raw = await res.text();
        console.log("🔧 GetServerInfo raw response:", raw);

        if (!raw || raw.trim().length === 0) {
          console.warn("⚠️ GetServerInfo returned empty body");
          return;
        }

        try {
          const parsed = JSON.parse(raw);
          console.log("🔧 GetServerInfo parsed JSON:", parsed);
        } catch (e) {
          console.warn("⚠️ GetServerInfo not valid JSON", e);
        }
      })
      .catch(err => console.warn("⚠️ GetServerInfo fetch failed:", err));
  });
})();
