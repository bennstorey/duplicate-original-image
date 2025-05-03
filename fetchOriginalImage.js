//2.6 Duplicate Original Image Plugin (Dossier Toolbar Button Version with Full Diagnostics)

console.log('[Duplicate Image Plugin] Registering plugin...');

(function () {
  if (!window.ContentStationSdk) {
    console.warn('[Duplicate Image Plugin] SDK not available.');
    return;
  }

  let studioServerUrl = '';

  ContentStationSdk.onSignin((info) => {
    console.log('[Duplicate Image Plugin] onSignin:', info);
    studioServerUrl = info?.ServerInfo?.Url || `${window.location.origin}`;
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

      const selected = selection[0];
      const objectId = selected?.Id || selected?.id || selected?.ID;
      console.log('[Duplicate Image Plugin] Selected object ID:', objectId);

      if (!objectId) {
        alert('Could not determine object ID from selection.');
        return;
      }

      try {
        // Fetch metadata
        const metaRes = await fetch(`${studioServerUrl}/json`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'GetObjectMetaData',
            params: { Id: objectId },
            id: 1,
            jsonrpc: '2.0'
          })
        });
        const meta = (await metaRes.json()).result;
        console.log('[Duplicate Image Plugin] Original object metadata:', meta);

        const basic = meta.MetaData.BasicMetaData;
        const content = meta.MetaData.ContentMetaData;

        // Fetch version 1 binary
        const binRes = await fetch(`${studioServerUrl}/json`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'GetObjectBinary',
            params: { Id: objectId, Version: 1 },
            id: 2,
            jsonrpc: '2.0'
          })
        });
        const blob = await binRes.blob();

        const formData = new FormData();
        formData.append('file', blob, `web_${basic.Name}`);

        const uploadRes = await fetch(`${studioServerUrl}/json?method=UploadFile`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        const uploadJson = await uploadRes.json();
        console.log('[Duplicate Image Plugin] UploadFile response:', uploadJson);

        const newObject = {
          __classname__: 'WWAsset',
          MetaData: {
            BasicMetaData: {
              Name: `web_${basic.Name}`,
              Type: 'Image',
              ObjectType: 'Image',
              Format: content.Format,
              Publication: { Id: basic.Publication.Id },
              Category: { Id: basic.Category.Id },
              WorkflowStatus: { Id: basic.WorkflowStatus?.Id || 'WIP' },
              ...(basic.Brand?.Id ? { Brand: { Id: basic.Brand.Id } } : {})
            },
            ContentMetaData: {
              Format: content.Format,
              Width: content.Width,
              Height: content.Height,
              Dpi: content.Dpi,
              ColorSpace: content.ColorSpace,
              HighResFile: uploadJson.result.ContentPath
            }
          }
        };

        // Run ValidateObjects
        const validateRes = await fetch(`${studioServerUrl}/json`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'ValidateObjects',
            params: { Objects: [newObject] },
            id: 98,
            jsonrpc: '2.0'
          })
        });
        console.log('[Duplicate Image Plugin] ValidateObjects result:', await validateRes.json());

        // Diagnostic: GetObjectTemplate
        const templateRes = await fetch(`${studioServerUrl}/json`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'GetObjectTemplate',
            params: { ObjectType: 'Image' },
            id: 99,
            jsonrpc: '2.0'
          })
        });
        console.log('[Duplicate Image Plugin] GetObjectTemplate result:', await templateRes.json());

        // Diagnostic: GetMetaDataInfo
        const mdiRes = await fetch(`${studioServerUrl}/json`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'GetMetaDataInfo',
            params: { ObjectType: 'Image' },
            id: 100,
            jsonrpc: '2.0'
          })
        });
        console.log('[Duplicate Image Plugin] GetMetaDataInfo result:', await mdiRes.json());

        // Diagnostic: Test CreateObjects
        const testCreateRes = await fetch(`${studioServerUrl}/json`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'CreateObjects',
            params: {
              Test: true,
              Objects: [newObject]
            },
            id: 101,
            jsonrpc: '2.0'
          })
        });
        console.log('[Duplicate Image Plugin] Test CreateObjects result:', await testCreateRes.json());

        // Real CreateObjects
        const payload = {
          method: 'CreateObjects',
          params: {
            Lock: true,
            SaveFormattedContent: true,
            Objects: [newObject]
          },
          id: 3,
          jsonrpc: '2.0'
        };

        console.log('[Duplicate Image Plugin] CreateObjects payload:', payload);

        const createRes = await fetch(`${studioServerUrl}/json`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const rawText = await createRes.text();
        console.log('[Duplicate Image Plugin] Raw CreateObjects response text:', rawText);

        let createJson = {};
        try {
          createJson = JSON.parse(rawText);
          console.log('[Duplicate Image Plugin] Parsed CreateObjects response:', createJson);
        } catch (err) {
          console.error('[Duplicate Image Plugin] Failed to parse CreateObjects JSON:', err);
        }

        if (createJson?.result?.Objects?.length > 0) {
          alert('Image duplicated successfully.');
        } else {
          console.error('[Duplicate Image Plugin] Unexpected CreateObjects response:', createJson);
          alert('Failed to duplicate image. No objects returned.');
        }
      } catch (err) {
        console.error('[Duplicate Image Plugin] Error duplicating image:', err);
        alert('Failed to duplicate image. Check console for details.');
      }
    }
  });
})();
