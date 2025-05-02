// 1.0 Duplicate Image Plugin (Studio Web compatible for direct JS URL)

console.log('[Duplicate Original Image Plugin] Initializing...');

const { registerPlugin } = window.ContentStationPluginSDK;

registerPlugin('Duplicate Original Image', async ({ pluginApi, selectedObjects }) => {
  console.log('[Duplicate Original Image Plugin] Plugin activated.');

  if (!selectedObjects || selectedObjects.length !== 1) {
    alert('Please select exactly one image.');
    console.warn('[Duplicate Original Image Plugin] Invalid selection:', selectedObjects);
    return;
  }

  const objectId = selectedObjects[0].Id;
  console.log('[Duplicate Original Image Plugin] Selected object ID:', objectId);

  try {
    console.log('[Duplicate Original Image Plugin] Fetching metadata...');
    const metaRes = await fetch('/server/Plugin/Api/Rest/GetObjectMetaData', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Id: objectId })
    });
    const meta = await metaRes.json();
    console.log('[Duplicate Original Image Plugin] Original object metadata:', meta);

    const basic = meta.MetaData.BasicMetaData;
    const content = meta.MetaData.ContentMetaData;

    console.log('[Duplicate Original Image Plugin] Downloading binary for version 1...');
    const binRes = await fetch(`/server/Plugin/Api/Rest/GetObjectBinary`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Id: objectId, Version: 1 })
    });
    const blob = await binRes.blob();
    console.log('[Duplicate Original Image Plugin] Binary download complete.');

    const formData = new FormData();
    formData.append('file', blob, `web_${basic.Name}`);

    console.log('[Duplicate Original Image Plugin] Uploading file...');
    const uploadRes = await fetch('/server/Plugin/Api/Rest/UploadFile', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const uploadJson = await uploadRes.json();
    console.log('[Duplicate Original Image Plugin] UploadFile response:', uploadJson);

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

    console.log('[Duplicate Original Image Plugin] CreateObjects payload:', payload);

    const createRes = await fetch('/server/Plugin/Api/Rest/CreateObjects', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const createJson = await createRes.json();
    console.log('[Duplicate Original Image Plugin] CreateObjects response:', createJson);
    alert('Image duplicated successfully.');
  } catch (err) {
    console.error('[Duplicate Original Image Plugin] Error duplicating image:', err);
    alert('Failed to duplicate image. Check console for details.');
  }
});

export default null;
