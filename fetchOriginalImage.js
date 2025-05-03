// Duplicate Original Image Plugin using CopyObject with enhanced diagnostics + validation via GetMetaDataInfo + version trace + selection sanity guard

console.log('// 4.7 Duplicate Original Image Plugin using CopyObject with enhanced diagnostics + validation via GetMetaDataInfo + version trace + selection sanity guard');
console.log('[Duplicate Image Plugin] Registering plugin...');

(function () {
  if (!window.ContentStationSdk) {
    console.warn('[Duplicate Image Plugin] SDK not available.');
    return;
  }

  ContentStationSdk.onSignin((info) => {
    console.log('[Duplicate Image Plugin] onSignin:', info);
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
      console.log('[Duplicate Image Plugin] Full selection[0] object:', selected);
      const objectId = selected?.Id || selected?.id || selected?.ID;
      console.log('[Duplicate Image Plugin] Selected object ID:', objectId);

      if (!objectId) {
        alert('Could not determine object ID from selection.');
        return;
      }

      try {
        const dossierId = dossier?.Id || dossier?.id;

        const metaRes = await fetch('/server/GetObjectMetaData', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ID: objectId })
        });
        const meta = await metaRes.json();
        console.log('[Duplicate Image Plugin] Original object metadata:', meta);

        const basic = meta.MetaData.BasicMetaData;
        const masterId = basic?.MasterId || '[none]';

        if (!basic?.Name || basic.Name !== selected.Name) {
          alert(`Mismatch between selected name and metadata name:\nSelected: ${selected.Name}\nMeta: ${basic.Name}`);
          console.warn('[Duplicate Image Plugin] Name mismatch between selection and metadata.', { selected, basic });
          return;
        }

        // Validate allowed values for Image
        const metaInfoRes = await fetch('/server/GetMetaDataInfo', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ObjectType: 'Image' })
        });
        const metaInfo = await metaInfoRes.json();
        console.log('[Diagnostic] GetMetaDataInfo for Image:', metaInfo);

        // Fetch Publication IDs from GetConfigInfo
        const configRes = await fetch('/server/GetConfigInfo', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const config = await configRes.json();
        const publications = config?.Publication || [];
        console.log('[Diagnostic] Publications from GetConfigInfo:', publications);

        let publicationId = basic.Publication;
        const match = publications.find(pub => pub.Name === basic.Publication);
        if (match) {
          publicationId = match.Id;
        }

        const alertText = `ID: ${objectId}\nName: ${basic.Name}\nMasterId: ${masterId}\nResolved Publication ID: ${publicationId}`;
        alert(alertText);

        const newName = `web_${basic.Name}`;

        const copyPayload = {
          SourceID: objectId,
          Targets: [
            {
              Dossier: { Id: dossierId },
              BasicMetaData: {
                Name: newName,
                Type: 'Image',
                Publication: publicationId,
                Category: basic.Category
              }
            }
          ]
        };

        console.log('[Diagnostic] Payload to CopyObject:', JSON.stringify(copyPayload, null, 2));

        const copyResRaw = await fetch('/server/CopyObject', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(copyPayload)
        });
        const copyRes = await copyResRaw.json();
        console.log('[Duplicate Image Plugin] CopyObject response:', copyRes);

        if (Array.isArray(copyRes?.Ids) && copyRes.Ids.length > 0) {
          console.log('[Duplicate Image Plugin] Duplicated image ID:', copyRes.Ids[0]);
          alert('Image duplicated successfully.');
          return;
        }

        console.warn('[Duplicate Image Plugin] CopyObject failed, falling back to CreateObjects.');

        const binaryRes = await fetch('/server/GetObjectBinary', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Id: objectId, Version: 1, Format: 'blob' })
        });
        const binaryBlob = await binaryRes.blob();

        const formData = new FormData();
        const fileName = `${newName}.${basic.Extension || 'jpg'}`;
        formData.append('file', binaryBlob, fileName);

        const uploadRes = await fetch('/upload/UploadFile', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        const uploadJson = await uploadRes.json();
        console.log('[Duplicate Image Plugin] UploadFile response:', uploadJson);

        const { UploadToken, ContentPath } = uploadJson.result;

        const createPayload = {
          Objects: [
            {
              __classname__: 'WWAsset',
              ObjectType: 'Image',
              Name: newName,
              Category: basic.Category,
              Publication: publicationId,
              Brand: basic.Brand,
              Dossier: { Id: dossierId },
              Format: basic.Format,
              ContentMetaData: {
                ContentPath,
                UploadToken
              },
              BasicMetaData: {
                Type: 'Image',
                Publication: publicationId,
                Category: basic.Category
              }
            }
          ]
        };

        console.log('[Diagnostic] Payload to CreateObjects:', JSON.stringify(createPayload, null, 2));

        const createResRaw = await fetch('/server/CreateObjects', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createPayload)
        });

        const status = createResRaw.status;
        const headers = [...createResRaw.headers.entries()];
        let bodyText;
        try {
          bodyText = await createResRaw.text();
        } catch (e) {
          bodyText = '[Could not read body]';
        }

        console.log('[Diagnostic] CreateObjects HTTP status:', status);
        console.log('[Diagnostic] CreateObjects response headers:', headers);
        console.log('[Diagnostic] CreateObjects raw body:', bodyText);

        try {
          const parsedBody = JSON.parse(bodyText);
          if (parsedBody?.Ids?.length) {
            alert('Image duplicated successfully via fallback.');
            return;
          }
        } catch (e) {
          console.warn('[Duplicate Image Plugin] CreateObjects response was not valid JSON.');
        }

        alert('Failed to duplicate image. Both CopyObject and fallback failed.');
      } catch (err) {
        console.error('[Duplicate Image Plugin] Unexpected error:', err);
        alert('Unexpected error duplicating image. See console.');
      }
    }
  });
})();
