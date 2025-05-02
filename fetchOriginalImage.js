//1.9 Duplicate Original Image Plugin (Dossier Toolbar Button Version)

console.log('[Duplicate Image Plugin] Registering plugin...');

(function () {
  if (!window.ContentStationSdk) {
    console.warn('[Duplicate Image Plugin] SDK not available.');
    return;
  }

  let studioServerUrl = '';

  ContentStationSdk.onSignin((info) => {
    console.log('[Duplicate Image Plugin] onSignin:', info);
    studioServerUrl = info?.ServerInfo?.Url || `${window.location.origin}/server`;
  });

  ContentStationSdk.addDossierToolbarButton({
    label: 'Duplicate Original Image',
    onInit: (button) => {
      console.log('[Duplicate Image Plugin] Button initialized.');
      button.isDisabled = false;
    },
    onAction: async (button, selection, dossier) => {
      console.log('[Duplicate Image Plugin] Action triggered.');
      if (!selection || selection.length !== 1) {
        alert('Please select exactly one image.');
        console.warn('[Duplicate Image Plugin] Invalid selection:', selection);
        return;
      }

      const objectId = selection[0].Id;
      console.log('[Duplicate Image Plugin] Selected object ID:', objectId);

      try {
        const metaRes = await fetch(`${studioServerUrl}/Plugin/Api/Rest/GetObjectMetaData`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Id: objectId })
        });
        const meta = await metaRes.json();
        console.log('[Duplicate Image Plugin] Original object metadata:', meta);

        const basic = meta.MetaData.BasicMetaData;
        const content = meta.MetaData.ContentMetaData;

        const binRes = await fetch(`${studioServerUrl}/Plugin/Api/Rest/GetObjectBinary`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Id: objectId, Version: 1 })
        });
        const blob = await binRes.blob();

        const formData = new FormData();
        formData.append('file', blob, `web_${basic.Name}`);

        const uploadRes = await fetch(`${studioServerUrl}/Plugin/Api/Rest/UploadFile`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        const uploadJson = await uploadRes.json();
        console.log('[Duplicate Image Plugin] UploadFile response:', uploadJson);

        const payload = {
          Lock: true,
          Objects: [
            {
              __classname__: 'WWAsset',
              MetaData: {
                BasicMetaData: {
                  Name: `web_${basic.Name}`,
                  Type: 'Image',
                  Publication: { Id: basic.Publication.Id },
                  Category: { Id: basic.Category.Id }
                },
                ContentMetaData: {
                  Format: content.Format,
                  Width: content.Width,
                  Height: content.Height,
                  Dpi: content.Dpi,
                  ColorSpace: content.ColorSpace,
                  HighResFile: uploadJson.ContentPath
                }
              }
            }
          ]
        };

        console.log('[Duplicate Image Plugin] CreateObjects payload:', payload);

        const createRes = await fetch(`${studioServerUrl}/Plugin/Api/Rest/CreateObjects`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const createJson = await createRes.json();
        console.log('[Duplicate Image Plugin] CreateObjects response:', createJson);
        alert('Image duplicated successfully.');
      } catch (err) {
        console.error('[Duplicate Image Plugin] Error duplicating image:', err);
        alert('Failed to duplicate image. Check console for details.');
      }
    }
  });
})();
