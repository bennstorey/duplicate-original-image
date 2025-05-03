//1.3 Duplicate Original Image Plugin using CopyObject with fallback and validation

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
        const newName = `web_${basic.Name}`;
        const dossierId = dossier?.Id || dossier?.id;

        // Attempt CopyObject first
        const copyPayload = {
          method: 'CopyObject',
          params: {
            SourceObjectId: objectId,
            NewName: newName,
            Dossier_Id: dossierId,
            PreserveVersions: true
          },
          id: 2,
          jsonrpc: '2.0'
        };

        console.log('[Duplicate Image Plugin] CopyObject payload:', copyPayload);

        const copyRes = await fetch(`${studioServerUrl}/json`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(copyPayload)
        });

        const rawCopyText = await copyRes.text();
        console.log('[Duplicate Image Plugin] Raw CopyObject response text:', rawCopyText);

        let copyJson = {};
        try {
          copyJson = JSON.parse(rawCopyText);
          console.log('[Duplicate Image Plugin] Parsed CopyObject response:', copyJson);
        } catch (err) {
          console.error('[Duplicate Image Plugin] Failed to parse CopyObject JSON:', err);
        }

        if (copyJson?.result?.Id) {
          alert('Image duplicated successfully.');
          return;
        }

        console.warn('[Duplicate Image Plugin] CopyObject failed or was not allowed, falling back to CreateObjects.');

        // Fallback to CreateObjects
        const uploadToken = basic.UploadToken || '';

        const fallbackPayload = {
          method: 'CreateObjects',
          params: {
            Objects: [
              {
                __classname__: 'WWAsset',
                ObjectType: 'Image',
                Name: newName,
                Category: basic.Category,
                Publication: basic.Publication,
                Brand: basic.Brand,
                Dossier: { Id: dossierId },
                ContentMetaData: {
                  ContentPath: basic.ContentPath,
                  UploadToken: uploadToken
                }
              }
            ]
          },
          id: 3,
          jsonrpc: '2.0'
        };

        console.log('[Duplicate Image Plugin] CreateObjects payload:', fallbackPayload);

        const createRes = await fetch(`${studioServerUrl}/json`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackPayload)
        });

        const rawCreateText = await createRes.text();
        console.log('[Duplicate Image Plugin] Raw CreateObjects response text:', rawCreateText);

        let createJson = {};
        try {
          createJson = JSON.parse(rawCreateText);
          console.log('[Duplicate Image Plugin] Parsed CreateObjects response:', createJson);
        } catch (err) {
          console.error('[Duplicate Image Plugin] Failed to parse CreateObjects JSON:', err);
        }

        if (createJson?.result?.Ids?.length) {
          alert('Image duplicated successfully via fallback.');
        } else {
          console.error('[Duplicate Image Plugin] Both CopyObject and CreateObjects failed:', createJson);
          alert('Failed to duplicate image. Both CopyObject and fallback failed.');
        }
      } catch (err) {
        console.error('[Duplicate Image Plugin] Unexpected error:', err);
        alert('Unexpected error duplicating image. See console.');
      }
    }
  });
})();
