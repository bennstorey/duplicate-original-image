// 1.0 Duplicate Original Image Plugin using CopyObject

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

        // Build CopyObject payload
        const payload = {
          method: 'CopyObject',
          params: {
            SourceObjectId: objectId,
            NewName: `web_${basic.Name}`,
            TargetDossier: { Id: dossier?.Id || dossier?.id }
          },
          id: 2,
          jsonrpc: '2.0'
        };

        console.log('[Duplicate Image Plugin] CopyObject payload:', payload);

        const copyRes = await fetch(`${studioServerUrl}/json`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const rawText = await copyRes.text();
        console.log('[Duplicate Image Plugin] Raw CopyObject response text:', rawText);

        let copyJson = {};
        try {
          copyJson = JSON.parse(rawText);
          console.log('[Duplicate Image Plugin] Parsed CopyObject response:', copyJson);
        } catch (err) {
          console.error('[Duplicate Image Plugin] Failed to parse CopyObject JSON:', err);
        }

        if (copyJson?.result?.Id) {
          alert('Image duplicated successfully.');
        } else {
          console.error('[Duplicate Image Plugin] Unexpected CopyObject response:', copyJson);
          alert('Failed to duplicate image. No object returned.');
        }
      } catch (err) {
        console.error('[Duplicate Image Plugin] Error duplicating image:', err);
        alert('Failed to duplicate image. Check console for details.');
      }
    }
  });
})();
