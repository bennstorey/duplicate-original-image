// Duplicate Image Plugin (with version 1 duplication)
// Assumes cookie-based auth and Studio Web SDK context
//version 2.3
//implementaiton url: https://bennstorey.github.io/duplicate-original-image/fetchOriginalImage.js


const { registerPlugin, showToast } = window.contentstationExtensionApi;

registerPlugin('duplicate-original-image', context => {
  console.log('[Duplicate Image Plugin] Plugin loaded');
  context.dossier.registerToolbarButton({
    icon: 'copy',
    tooltip: 'Duplicate Original Image (v1)',
    onClick(selection) {
      console.log('[Duplicate Image Plugin] Toolbar button clicked');
        if (!selection || selection.length === 0) throw new Error('No objects selected');

        const image = selection[0];
        const objectId = image.id;
        const dossierId = image.dossier?.id || image.parentId;
        if (!dossierId) throw new Error('Dossier ID missing');

        // 1. Get full object metadata
        const metaResp = await fetch(`/server/json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'GetObjects',
            id: '1',
            params: [{ ObjectIds: [objectId] }],
            jsonrpc: '2.0'
          })
        });
        const metaJson = await metaResp.json();
        const originalMeta = metaJson.result.Objects[0].MetaData;

        // 2. Get version 1 FileUrl
        const verResp = await fetch(`/server/json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'ListVersions',
            id: '2',
            params: [{ ObjectId: objectId }],
            jsonrpc: '2.0'
          })
        });
        const verJson = await verResp.json();
        const version1 = verJson.result.Versions.find(v => v.Version === 1);
        if (!version1) throw new Error('Version 1 not found');

        // 3. Download binary of version 1
        const fileBlob = await (await fetch(version1.FileUrl)).blob();

        // 4. Upload new file
        const uploadResp = await fetch(`/server/UploadFile`, {
          method: 'PUT',
          headers: { 'X-WW-TransferMode': 'raw' },
          body: fileBlob
        });
        if (!uploadResp.ok) throw new Error('Upload failed');
        const uploadUrl = uploadResp.headers.get('Location');

        // 5. Build CreateObjects payload
        const newName = `web_${originalMeta.BasicMetaData.Name}`;

        const createPayload = {
          method: 'CreateObjects',
          id: '3',
          params: [
            {
              Lock: false,
              Objects: [
                {
                  __classname__: 'Object',
                  MetaData: {
                    ...originalMeta,
                    BasicMetaData: {
                      ...originalMeta.BasicMetaData,
                      Name: newName
                    },
                    __classname__: 'MetaData'
                  },
                  Files: [
                    {
                      Rendition: 'native',
                      Type: originalMeta.ContentMetaData.Format,
                      FileUrl: uploadUrl,
                      __classname__: 'Attachment'
                    }
                  ],
                  Relations: [
                    {
                      __classname__: 'Relation',
                      Parent: dossierId,
                      Type: 'Contained',
                      Targets: []
                    }
                  ]
                }
              ]
            }
          ],
          jsonrpc: '2.0'
        };

        const createResp = await fetch(`/server/json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload)
        });

        const createJson = await createResp.json();
        if (createJson.error) throw new Error(createJson.error.message);

        showToast('Image duplicated as version 1');
      } catch (err) {
        console.error(err);
        showToast('Error: ' + err.message, 'error');
      }
    }
  });
});
