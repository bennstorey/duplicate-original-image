(function () {
  if (typeof ContentStationSdk !== "undefined") {
    console.log("✅ dragToInDesign-style plugin: ContentStationSdk is available");

    ContentStationSdk.addDossierToolbarButton({
      id: "test-drag-style-plugin",
      label: "Test Drag Style Plugin",
      icon: "bug_report",
      onClick: function (dossier) {
        console.log("✅ Button clicked inside dossier:", dossier);
        alert("✅ dragToInDesign-style plugin executed successfully.");
      }
    });

    console.log("✅ dragToInDesign-style plugin: Button registered");
  } else {
    console.error("❌ dragToInDesign-style plugin: ContentStationSdk is NOT available");
  }
})();
