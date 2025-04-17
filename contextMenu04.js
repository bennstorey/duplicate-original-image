(function () {
  console.log("🟢 DuplicateOriginalImage plugin: starting");

  function waitForContentStationSdk(callback) {
    if (typeof ContentStationSdk !== "undefined") {
      console.log("🟢 ContentStationSdk is available");
      callback();
    } else {
      console.log("⏳ Waiting for ContentStationSdk...");
      setTimeout(() => waitForContentStationSdk(callback), 500);
    }
  }

  waitForContentStationSdk(() => {
    console.log("⏳ Registering context menu item...");

    ContentStationSdk.addContextMenuItem({
      id: "duplicate-original-image",
      label: "Duplicate Original Image",
      tooltip: "Creates a copy from the original version of the image",
      icon: "content_copy",
      when: (selection) => {
        console.log("🧪 Evaluating context menu 'when' condition", selection);
        return selection.length === 1 && selection[0].objectType === "Image";
      },
      onClick: async () => {
        console.log("🟡 Context menu clicked: Duplicate Original Image");
        alert("🟡 You clicked 'Duplicate Original Image'");
      }
    });

    console.log("✅ Context menu item registered");
  });
})();
