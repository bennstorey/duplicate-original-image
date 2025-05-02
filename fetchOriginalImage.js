// Duplicate Image Plugin (patched for valid CreateObjects payload)

import { registerPlugin } from 'ContentStationPluginSDK';

registerPlugin('Duplicate Original Image', async ({ pluginApi, selectedObjects }) => {
  if (!selectedObjects || selectedObjects.length !== 1) {
    alert('Please select exactly one image.');
    return;
  }

  const objectId = selectedObjects[0].Id;
  console.log('Selected object ID:', objectId);

  try {
    // Fetch original metadata
    const metaRes = await fetch('/server/Plugin/Api/Rest/GetObjectMetaData', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Id: objectId })
    });
    const meta = await metaRes.json();
    console.log('Original object metadata:', meta);

    const basic = meta.MetaData.BasicMetaData;
    const content = meta.MetaData.ContentMetaData;

    // Download binary of version 1
    const binRes = await fetch(`/server/Plugin/Api/Rest/GetObjectBinary`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Id: objectId, Version: 1 })
    });
    const blob = await binRes.blob();

    // Upload file
    const formData = new FormData();
    formData.append('file', blob, `web_${basic.Name}`);

    const uploadRes = await fetch('/server/Plugin/Api/Rest/UploadFile', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const uploadJson = await uploadRes.json();
    console.log('UploadFile response:', uploadJson);

    // Build CreateObjects payload
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
              HighResFile: uploadJson.ContentPath // or UploadToken: uploadJson.UploadToken
            }
          }
        }
      ]
    };

    console.log('CreateObjects payload:', payload);

    // Call CreateObjects
    const createRes = await fetch('/server/Plugin/Api/Rest/CreateObjects', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const createJson = await createRes.json();
    console.log('CreateObjects response:', createJson);
    alert('Image duplicated successfully.');
  } catch (err) {
    console.error('Error duplicating image:', err);
    alert('Failed to duplicate image. Check console for details.');
  }
});
