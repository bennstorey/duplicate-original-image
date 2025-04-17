(function () {
  console.log("✅ 009 DuplicateOriginalImage plugin: starting");

  function waitForContentStationSdk(callback) {
    if (typeof ContentStationSdk !== "undefined") {
      console.log("✅ ContentStationSdk is available");
      callback();
    } else {
      console.log("⏳ Waiting for ContentStationSdk...");
      setTimeout(() => waitForContentStationSdk(callback), 500);
    }
  }

  waitForContentStationSdk(() => {
    console.log("⏳ Registering dossier toolbar button");

    ContentStationSdk.addDossierToolbarButton({
      id: "duplicate-original-image",
      label: "Duplicate Original",
      tooltip: "Duplicate the original version of the selected image",
      icon: "content_copy",
      onClick: function () {
        console.log("🟡 Duplicate button clicked");
        alert("✅ The button is working!");
      }
    });

    console.log("✅ DuplicateOriginalImage plugin: Button registered");
  });
})();
