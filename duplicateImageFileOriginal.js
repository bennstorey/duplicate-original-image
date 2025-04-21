(function () {
  console.log("✅ E42 Plugin: Duplicate Original Image - Upload Debug Enhancements");

  let sessionInfo = null;

  ContentStationSdk.onSignin((info) => {
    console.log("🔑 Signin callback received:", info);
    sessionInfo = {
      ticket: info?.Ticket || '',
      studioServerUrl: info?.Url || `${location.origin}/server`
    };

    if (!sessionInfo.ticket) {
      console.warn("⚠️ Ticket not present — using cookie-based auth");
    }
    console.log("📡 Session Info:", sessionInfo);

    const serverUrl = sessionInfo.studioServerUrl;
    const headers = {
      "Content-Type": "application/json",
      ...(sessionInfo.ticket ? {} : { "X-Requested-With": "XMLHttpRequest" })
    };

    ContentStationSdk.addDossierToolbarButton({
      label: "Duplicate Image(s)",
      id: "duplicate-image-button",
      onInit: (button, selection) => {
        button.isDisabled = !selection || selection.length === 0 || !selection.every(item => item.Type === "Image");
      },
      onAction: async (button, selection, dossier) => {
        try {
          if (!sessionInfo || !sessionInfo.studioServerUrl) {
            const fallback = ContentStationSdk.getInfo();
            sessionInfo.studioServerUrl = fallback?.Url || `${location.origin}/server`;
            sessionInfo.ticket = fallback?.Ticket || '';
            console.log("🆗 Refetched session info:", sessionInfo);
          }

          console.log("📦 Selection:", selection);
          const objectId = selection?.[0]?.ID;
          if (!objectId) throw new Error("No object ID found in selection.");
          console.log("🆔 Selected object ID:", objectId);

          const fetchAndParse = async (url, label, body) => {
            console.log(`📤 Sending to ${label}:", JSON.stringify(body));
            const res = await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(body)
            });
            console.log(`📡 ${label} → HTTP`, res.status, res.statusText);
            const raw = await res.text();
            console.log(`📡 ${label} raw response:", raw);
            if (!raw || raw.trim().length === 0) throw new Error(`${label} returned empty body`);
            try {
              return JSON.parse(raw);
            } catch (e) {
              console.warn(`⚠️ ${label} not valid JSON`, e);
              throw e;
            }
          };

          const metaJson = await fetchAndParse(
            `${serverUrl}/index.php?protocol=JSON&method=GetObjectMetaData`,
            "GetObjectMetaData",
            { ObjectId: objectId, ...(sessionInfo.ticket ? { Ticket: sessionInfo.ticket } : {}) }
          );

          const templateJson = await fetchAndParse(
            `${serverUrl}/index.php?protocol=JSON&method=GetObjectTemplate`,
            "GetObjectTemplate",
            { Type: "Image", ...(sessionInfo.ticket ? { Ticket: sessionInfo.ticket } : {}) }
          );

          const original = metaJson?.Object;
          const template = templateJson?.ObjectTemplate?.Objects?.[0] || {};

          console.log("📦 Original metadata:", original);
          console.log("🧱 Template metadata:", template);

          const binaryRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=GetObjectBinary`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ObjectId: objectId, Version: 1, ...(sessionInfo.ticket ? { Ticket: sessionInfo.ticket } : {}) })
          });
          const buffer = await binaryRes.arrayBuffer();
          const blob = new Blob([buffer], { type: original.Format || 'application/octet-stream' });
          const file = new File([blob], `web_${original.Name}`, { type: blob.type });

          const form = new FormData();
          form.append("File", file);
          if (sessionInfo.ticket) form.append("Ticket", sessionInfo.ticket);

          const uploadRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=UploadFile`, {
            method: "POST",
            headers: {},
            body: form
          });

          const rawUploadText = await uploadRes.text();
          console.log("📤 UploadFile raw text:", rawUploadText);
          const uploadJson = JSON.parse(rawUploadText);
          const { UploadToken, ContentPath } = uploadJson;

          const payload = {
            Ticket: sessionInfo.ticket,
            Objects: [
              {
                __classname__: "WWAsset",
                Type: "Image",
                Name: `web_${original.Name}`,
                TargetName: `web_${original.Name}`,
                Dossier: { ID: dossier.ID },
                UploadToken,
                ContentPath,
                Format: original.Format,
                Category: original.Category || template.Category,
                Publication: original.Publication || template.Publication,
                Brand: original.Brand || template.Brand || '',
                WorkflowStatus: original.WorkflowStatus || template.WorkflowStatus || '',
                AssetInfo: { OriginalFileName: original.Name }
              }
            ]
          };

          console.log("🔍 Sending to ValidateObjects:", JSON.stringify(payload, null, 2));

          const validateRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=ValidateObjects`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
          });

          const validateText = await validateRes.text();
          console.log("📄 ValidateObjects response:", validateText);

          let validateJson;
          try {
            validateJson = JSON.parse(validateText);
          } catch (e) {
            throw new Error("ValidateObjects did not return valid JSON");
          }

          const errors = validateJson?.Objects?.[0]?.Errors;
          if (errors && errors.length > 0) {
            console.warn("🚫 Validation errors:", errors);
            ContentStationSdk.showNotification({
              content: `❌ Validation failed: ${errors.map(e => e.ErrorDescription || e.Message || JSON.stringify(e)).join(", ")}`
            });
            return;
          }

          console.log("📨 Sending to CreateObjects:", JSON.stringify(payload, null, 2));

          const createRes = await fetch(`${serverUrl}/index.php?protocol=JSON&method=CreateObjects`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
          });

          const rawCreateText = await createRes.text();
          console.log("📥 CreateObjects response text:", rawCreateText);

          let createResult;
          try {
            createResult = JSON.parse(rawCreateText);
          } catch (e) {
            console.error("❌ CreateObjects response not valid JSON:", e);
            throw new Error("CreateObjects did not return valid JSON");
          }

          console.log("✅ Created object:", createResult);
          ContentStationSdk.showNotification({ content: "✅ Image duplicated successfully." });

        } catch (err) {
          console.error("❌ Duplication flow failed:", err);
          ContentStationSdk.showNotification({ content: "❌ Duplication failed. Check console." });
        }
      }
    });
  });
})();
