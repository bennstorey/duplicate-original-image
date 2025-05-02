// 1.2 Duplicate Original Image Plugin (stable fallback - working version)

console.log('[Duplicate Image Plugin] Booting plugin...');

(async function initPlugin() {
  const sdk = window.ContentStationPluginSDK;
  const info = await sdk.getInfo();
  console.log('[Duplicate Image Plugin] Plugin info:', info);

  sdk.registerPlugin('Duplicate Original Image', async ({ pluginApi, selectedObjects }) => {
    console.log('[Duplicate Image Plugin] Activated.');

    if (!selectedObjects || selectedObjects.length !== 1) {
      alert('Please select exactly one image.');
      console.warn('[Duplicate Image Plugin] Invalid selection:', selectedObjects);
      return;
    }

    const objectId = selectedObjects[0].Id;
    console.log('[Duplicate Image Plugin] Selected object ID:', objectId);

    try {
      console.log('[Duplicate Image Plugin] Fetching metadata...');
      const metaRes = await fetch('/server/Plugin/Api/Rest/GetObjectMetaData', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Id: objectId })
      });
      const meta = await metaRes.json();
      console.log('[Duplicate Image Plugin] Metadata:', meta);

      const basic = meta.MetaData.BasicMetaData;
      const content = meta.MetaData.ContentMetaData;

      console.log('[Duplicate Image Plugin] Fetching binary for version 1...');
      const binRes = await fetch('/server/Plugin/Api/Rest/GetObjectBinary', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Id: objectId, Version: 1 })
      });
      const blob = await binRes.blob();

      console.log('[Duplicate Image Plugin] Uploading binary...');
      const formData = new FormData();
      formData.append('file', blob, `web_${basic.Name}`);

      const uploadRes = await fetch('/server/Plugin/Api/Rest/UploadFile', {
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

      console.log('[Duplicate Image Plugin] Sending CreateObjects request...', payload);
      const createRes = await fetch('/server/Plugin/Api/Rest/CreateObjects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const createJson = await createRes.json();
      console.log('[Duplicate Image Plugin] CreateObjects response:', createJson);
      alert('Image duplicated successfully.');
    } catch (err) {
      console.error('[Duplicate Image Plugin] Duplication failed:', err);
      alert('Image duplication failed. Check the console for details.');
    }
  });
})();
