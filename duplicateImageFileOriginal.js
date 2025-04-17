(function () {
  console.log("✅ A05 Plugin: Duplicate Original Image - Dossier Toolbar");

  window.addEventListener("click", function () {
    console.log("🧪 Global window click detected");
  });

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
      id: "duplicate-original-image",
      label: "Duplicate Original Image",
      tooltip: "Duplicate version 1 of the selected image with a web_ prefix",
      icon: "content_copy",
      onClick: function () {
        debugger;
        console.log("🟡 Duplicate button clicked — initiating handler");

        ContentStationSdk.getCurrentSelection()
          .then(function (selection) {
            console.log("📦 Selection:", selection);
            var selected = selection && selection[0];

            if (!selected || selected.objectType !== "Image") {
              alert("Please select a single image to duplicate.");
              return;
            }

            var objectId = selected.id;
            var ticket, serverUrl;

            ContentStationSdk.getSessionTicket()
              .then(function (t) {
                ticket = t;
                return ContentStationSdk.getStudioServerUrl();
              })
              .then(function (url) {
                serverUrl = url;
                return fetch(serverUrl + "/webservices/StudioServer.svc/GetObjectMetaData", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ Ticket: ticket, ObjectId: objectId })
                });
              })
              .then(function (res) { return res.json(); })
              .then(function (meta) {
                return fetch(serverUrl + "/webservices/StudioServer.svc/GetObjectBinary", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ Ticket: ticket, ObjectId: objectId, Version: 1 })
                }).then(function (res) {
                  return res.arrayBuffer().then(function (buffer) {
                    return { buffer: buffer, meta: meta };
                  });
                });
              })
              .then(function (data) {
                var buffer = data.buffer;
                var meta = data.meta;

                var blob = new Blob([buffer], { type: meta.Object.Format || "application/octet-stream" });
                var originalName = meta.Object.Name;
                var newName = "web_" + originalName;
                var file = new File([blob], newName, { type: blob.type });

                var form = new FormData();
                form.append("Ticket", ticket);
                form.append("File", file);

                return fetch(serverUrl + "/webservices/StudioServer.svc/UploadFile", {
                  method: "POST",
                  body: form
                }).then(function (res) { return res.json(); })
                  .then(function (uploadJson) {
                    var contentPath = uploadJson.Path;
                    return fetch(serverUrl + "/webservices/StudioServer.svc/CreateObjects", {
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
                              ContentPath: contentPath
                            }
                          }
                        ]
                      })
                    });
                  });
              })
              .then(function (res) { return res.json(); })
              .then(function (createResult) {
                var newId = createResult.Objects && createResult.Objects[0] && createResult.Objects[0].Id;
                alert("✅ Created duplicate image with ID: " + newId);
              })
              .catch(function (err) {
                console.error("❌ Failed to duplicate image:", err);
                alert("❌ Failed to duplicate image. See console for details.");
              });
          })
          .catch(function (e) {
            console.warn("⚠️ Could not get selection:", e);
          });
      }
    });

    console.log("✅ DuplicateOriginalImage plugin: Button registered");

    // 🧪 Fallback handler registration via DOM
    setTimeout(() => {
      const button = document.querySelector('[data-id="duplicate-original-image"]');
      if (button) {
        button.addEventListener("click", function () {
          console.log("🟡 Duplicate button clicked — workaround handler fired");
        });
      } else {
        console.warn("❌ Could not find button in DOM for workaround handler");
      }
    }, 1000);
  });
})();
