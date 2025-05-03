// Duplicate Original Image Plugin using CopyObject with Studio Cloud-compatible endpoints + diagnostics

console.log('//5.4 Duplicate Original Image Plugin vCLOUD_FINAL_FIX');

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
        return;
      }

      const selected = selection[0];
      const objectId = selected?.Id || selected?.id || selected?.ID;
      console.log('[Duplicate Image Plugin] Selected object ID:', objectId);

      if (!objectId) {
        alert('Invalid object ID.');
        return;
      }

      try {
        const dossierId = dossier?.Id || dossier?.id;

        const post = async (method, payload) => {
          const url = `/server/index.php?protocol=JSON&method=${method}`;
          const res = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const text = await res.text();
          console.log(`[HTTP] ${method} status ${res.status}`);
          console.log(`[HTTP] ${method} raw body:`, text);
          try {
            return JSON.parse(text);
          } catch (err) {
            console.error(`[${method}] Failed to parse JSON`, err);
            return {};
          }
        };

        const meta = await post('GetObjectMetaData', { ID: objectId });
        const basic = meta?.MetaData?.BasicMetaData;

        if (!basic || !basic.Name) {
          alert('Failed to retrieve object metadata. Cannot continue.');
          console.error('Empty metadata response:', meta);
          return;
        }

        if (basic.Name !== selected.Name) {
          alert(`Mismatch between selected and metadata name:\nSelected: ${selected.Name}\nMeta: ${basic.Name}`);
          return;
        }

        const newName = `web_${basic.Name}`;

        const tmpl = await post('GetObjectTemplate', { ObjectType: 'Image' });
        const config = await post('GetConfigInfo', {});

        const pubs = config?.Publication || [],
              brands = config?.Brand || [],
              cats = config?.Category || [];

        let pubId = pubs.find(p => p.Name === basic.Publication)?.Id || tmpl?.Object?.Publication || '';
        let brandId = brands.find(b => b.Name === basic.Brand)?.Id || tmpl?.Object?.Brand || '';
        let catId = cats.find(c => c.Name === basic.Category)?.Id || tmpl?.Object?.Category || '';

        const copyPayload = {
          SourceID: objectId,
          Targets: [
            {
              Dossier: { Id: dossierId },
              BasicMetaData: {
                ...basic,
                Name: newName
              }
            }
          ]
        };

        const copyRes = await post('CopyObject', copyPayload);
        if (Array.isArray(copyRes?.Ids) && copyRes.Ids.length > 0) {
          alert('Image duplicated successfully.');
          return;
        }

        console.warn('[Duplicate Image Plugin] CopyObject failed, fallback starting.');

        const blob = await (await fetch(`/server/index.php?protocol=JSON&method=GetObjectBinary`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Id: objectId, Version: 1, Format: 'blob' })
        })).blob();

        const formData = new FormData();
        const fileName = `${newName}.${basic.Extension || 'jpg'}`;
        formData.append('file', blob, fileName);

        const uploadRes = await fetch('/upload/UploadFile', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        const uploadJson = await uploadRes.json();
        const { UploadToken, ContentPath } = uploadJson.result || {};

        const createPayload = {
          Objects: [
            {
              __classname__: 'WWAsset',
              ObjectType: 'Image',
              Name: newName,
              Format: basic.Format,
              Category: catId,
              Publication: pubId,
              Brand: brandId,
              Dossier: { Id: dossierId },
              ContentMetaData: { ContentPath, UploadToken },
              BasicMetaData: {
                Type: 'Image',
                Publication: pubId,
                Category: catId
              }
            }
          ]
        };

        const createRes = await post('CreateObjects', createPayload);
        if (Array.isArray(createRes?.Ids) && createRes.Ids.length > 0) {
          alert('Image duplicated successfully via fallback.');
        } else {
          alert('Failed to duplicate image. CopyObject and fallback both failed.');
        }
      } catch (err) {
        console.error('[Duplicate Image Plugin] Fatal error:', err);
        alert('Unexpected error. See console for details.');
      }
    }
  });
})();
