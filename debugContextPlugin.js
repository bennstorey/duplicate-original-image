(function () {
  console.log("🔍 Plugin script loaded");

  setTimeout(function () {
    if (typeof ContentStationSdk !== "undefined") {
      console.log("✅ ContentStationSdk is available in setTimeout");

      ContentStationSdk.addContextMenuItem({
        id: "debug-context-menu",
        label: "Debug Context Plugin",
        icon: "bug_report",
        applicableTo: ["Image"],
        onClick: function (object) {
          console.log("🐛 Debug plugin triggered for:", object);
          alert("🐛 Debug plugin clicked for: " + object.name);
        }
      });

      console.log("✅ Context menu item registered");
    } else {
      console.error("❌ ContentStationSdk still NOT available after timeout");
    }
  }, 1000);
})();
