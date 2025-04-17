(function () {
  console.log("🧪 Registering context menu test plugin");

  function waitForContentStationSdk(callback) {
    if (typeof ContentStationSdk !== "undefined") {
      callback();
    } else {
      setTimeout(() => waitForContentStationSdk(callback), 500);
    }
  }

  waitForContentStationSdk(() => {
    console.log("🧪 ContentStationSdk is available");

    ContentStationSdk.registerPlugin({
      id: "context-menu-test-plugin",
      contextMenuItem: {
        label: "🧪 Test Image Click",
        forObjectTypes: ["Image"],
        onClick: async (context) => {
          console.log("✅ Context menu clicked with context:", context);
          alert("🧪 Context menu clicked!");
        }
      }
    });

    console.log("✅ Context menu test plugin registered");
  });
})();
