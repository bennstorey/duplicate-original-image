//version 2.6
//implementaiton url: https://bennstorey.github.io/duplicate-original-image/fetchOriginalImage.js

// Duplicate Image Plugin (known working minimal base)
// Uses cookie-based auth and global extension API

const { registerPlugin, showToast } = window.contentstationExtensionApi;

registerPlugin('duplicate-original-image', context => {
  console.log('[Duplicate Image Plugin] Plugin loaded');

  context.dossier.registerToolbarButton({
    icon: 'copy',
    tooltip: 'Duplicate Original Image (v1)',
    onClick(selection) {
      console.log('[Duplicate Image Plugin] Toolbar button clicked');
      showToast('This is a test of the known working plugin base.');
    }
  });
});
