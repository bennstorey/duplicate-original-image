(function () {
  console.log("✅ 001 Plugin: Duplicate Original Image from Digital Article");

  function waitForEditorUiSdk(callback) {
    if (typeof window.EditorUiSdk !== "undefined") {
      console.log("✅ EditorUiSdk is available");
      callback();
    } else {
      console.log("⏳ Waiting for EditorUiSdk...");
      setTimeout(() => waitForEditorUiSdk(callback), 300);
    }
  }

  waitForEditorUiSdk(() => {
    const plugin = {
      id: "duplicate-original-image",
      init: async (ui) => {
        console.log("✅ Digital Editor plugin initialized");

        ui.toolbar.addButton({
          id: "duplicate-original-image",
          label: "Duplicate Image",
          tooltip: "Duplicate an image in the same dossier",
          icon: "content_copy",
          onClick: async () => {
            console.log("🟡 Duplicate button clicked");
            try {
              const context = await ui.getContext();
              const articleId = context.article.id;
              const dossierId = context.article.dossierId;

              console.log("📄 Article ID:", articleId);
              console.log("📁 Dossier ID:", dossierId);

              if (!dossierId) {
                alert("This article is not part of a dossier.");
                return;
              }

              // At this point we can continue to fetch the dossier contents
              // and filter for images in the next step.

              alert("✅ Ready to fetch dossier contents and find images to duplicate.");

            } catch (error) {
              console.error("❌ Error in duplicate button logic:", error);
              alert("❌ Something went wrong. See console for details.");
            }
          }
        });

        console.log("✅ Toolbar button registered");
      }
    };

    window.EditorUiSdk.registerPlugin(plugin);
  });
})();
