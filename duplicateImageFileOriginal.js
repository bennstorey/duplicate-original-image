window.ContextActions = window.ContextActions || [];
window.ContextActions.push({
  name: "duplicate-original-image",
  label: "Duplicate Original Image(s)",
  tooltip: "Duplicate version 1 of the selected image(s) with a web_ prefix",
  icon: "content_copy",

  // Only show for selected image(s)
  shouldShow: function (selection) {
    return selection && selection.length > 0 && selection.every(item => item.Type === "Image");
  },

  // Your main action logic
  onAction: function (config, selection, dossier) {
    console.log("📦 Selection:", selection);
    alert("Action triggered for " + selection.length + " image(s).");
  }
});
