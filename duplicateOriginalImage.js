(function () {
  console.log("✅ 006 DuplicateOriginalImage plugin: starting");

  function waitForContentStationSdk(callback) {
    if (typeof ContentStationSdk !== "undefined") {
      console.log("✅ DuplicateOriginalImage plugin: ContentStationSdk is available");
      callback();
    } else {
      console.log("⏳ Waiting for ContentStationSdk...");
      setTimeout(() => waitForContentStationSdk(callback), 500);
    }
  }

 waitForContentStationSdk(() => {
  console.log("⏳ Attempting to register DuplicateOriginalImage button");

  ContentStationSdk.addDossierToolbarButton({
    id: "duplicate-original-image",
    label: "Duplicate Original",
    tooltip: "Duplicate the original version of the selected image",
    icon: "content_copy",
    onClick: async (context) => {
      console.log("🟡 Duplicate button clicked");
      alert("🟡 Duplicate button clicked");
    }
  });

  console.log("✅ DuplicateOriginalImage plugin: Button registered");
});

})();
