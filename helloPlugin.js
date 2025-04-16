(function () {
  window.plugin = {
    initialize: function (api) {
      console.log("✅ HelloPlugin: initialized");
      alert("✅ HelloPlugin loaded successfully!");

      api.ui.addObjectDetailPanelButton({
        id: 'hello-plugin-button',
        label: 'Hello Plugin Button',
        icon: 'info',
        onClick: function (selectedObject) {
          alert("Hello from the plugin! You selected: " + (selectedObject ? selectedObject.name : "nothing"));
        }
      });
    }
  };
})();
