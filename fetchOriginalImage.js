//3.3 Duplicate Original Image Plugin using CopyObject with enhanced diagnostics

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

        // Diagnostic: Fetch CopyTo template
        const diagTemplate = await ContentStationSdk.callServerMethod('GetObjectTemplate', {
          Operation: 'CopyTo',
          ObjectType: 'Image'
        });
        console.log('[Duplicate Image Plugin] GetObjectTemplate (CopyTo) response:', diagTemplate);

        // Step 1: Fetch metadata
        const meta = await ContentStationSdk.callServerMethod('GetObjectMetaData', {
          Id: objectId
        });
        console.log('[Duplicate Image Plugin] Original object metadata:', meta);

        const basic = meta.MetaData.BasicMetaData;
        alert(`ID: ${objectId}\nServer returned Name: ${basic.Name}`); // Diagnostic alert
        const newName = `web_${basic.Name}`;

        // Step 2: Attempt CopyObject with required fields from template
        const copyPayload = {
          SourceID: objectId,
          Targets: [
            {
              Dossier: { Id: dossierId },
              BasicMetaData: {
                Name: newName,
                Type: 'Image',
                Publication: basic.Publication,
                Category: basic.Category
              }
            }
          ]
        };

        console.log('[Diagnostic] Payload to CopyObject:', JSON.stringify(copyPayload, null, 2));
        const copyRes = await ContentStationSdk.callServerMethod('CopyObject', copyPayload);
        console.log('[Duplicate Image Plugin] CopyObject response:', copyRes);

        if (Array.isArray(copyRes?.Ids) && copyRes.Ids.length > 0) {
          console.log('[Duplicate Image Plugin] Duplicated image ID:', copyRes.Ids[0]);
          alert('Image duplicated successfully.');
          return;
        }

        console.warn('[Duplicate Image Plugin] CopyObject failed, falling back to CreateObjects.');

        // Step 3: Fetch version 1 binary
        const binaryBlob = await ContentStationSdk.callServerMethod('GetObjectBinary', {
          Id: objectId,
          Version: 1,
          Format: 'blob'
        });

        // Step 4: Upload binary
        const formData = new FormData();
        const fileName = `${newName}.${basic.Extension || 'jpg'}`;
        formData.append('file', binaryBlob, fileName);

        const uploadRes = await fetch(`/upload/UploadFile`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        const uploadJson = await uploadRes.json();
        console.log('[Duplicate Image Plugin] UploadFile response:', uploadJson);

        const { UploadToken, ContentPath } = uploadJson.result;

        // Step 5: Create new object
        const createPayload = {
          Objects: [
            {
              __classname__: 'WWAsset',
              ObjectType: 'Image',
              Name: newName,
              Category: basic.Category,
              Publication: basic.Publication,
              Brand: basic.Brand,
              Dossier: { Id: dossierId },
              Format: basic.Format,
              ContentMetaData: {
                ContentPath,
                UploadToken
              },
              BasicMetaData: {
                Type: 'Image',
                Publication: basic.Publication,
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
