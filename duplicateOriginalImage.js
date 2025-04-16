(function () {
  'use strict';

  // Wait for the Studio Web Client SDK to load
  window.studioPlugin = {
    initialize: async function (api) {
      console.log('✅ Duplicate Original Image plugin initialized');

      // Add a button to the object details panel
      api.ui.addObjectDetailPanelButton({
        id: 'duplicate-original-button',
        label: 'Duplicate Original Version',
        icon: 'content_copy',
        onClick: async (selectedObject) => {
          try {
            if (!selectedObject || selectedObject.objectType !== 'Image') {
              alert('Please select a single image.');
              return;
            }

            const objectId = selectedObject.id;
            const ticket = await api.session.getTicket();
            const serverUrl = await api.session.getStudioServerUrl();

            const fetchJson = async (endpoint, body) => {
              const res = await fetch(`${serverUrl}/webservices/StudioServer.svc/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Ticket: ticket, ...body })
              });
              return res.json();
            };

            const fetchBinary = async (endpoint, body) => {
              const res = await fetch(`${serverUrl}/webservices/StudioServer.svc/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Ticket: ticket, ...body })
              });
              return res.arrayBuffer();
            };

            const meta = await fetchJson('GetObjectMetaData', { ObjectId: objectId });
            const buffer = await fetchBinary('GetObjectBinary', { ObjectId: objectId, Version: 1 });

            const blob = new Blob([buffer], {
              type: meta.Object.Format || 'application/octet-stream'
            });

            const originalName = meta.Object.Name;
            const newName = originalName.replace(/\.(\w+)$/, '_web.$1');
            const file = new File([blob], newName, { type: blob.type });

            const form = new FormData();
            form.append('Ticket', ticket);
            form.append('File', file);

            const uploadRes = await fetch(`${serverUrl}/webservices/StudioServer.svc/UploadFile`, {
              method: 'POST',
              body: form
            });
            const uploadJson = await uploadRes.json();
            const contentPath = uploadJson.Path;

            const createResult = await fetchJson('CreateObjects', {
              Objects: [{
                __classname__: 'com.woodwing.assets.server.object.Asset',
                Name: newName,
                Category: meta.Object.Category,
                Dossier: meta.Object.Dossier,
                ContentMetaData: {
                  ContentPath: contentPath
                }
              }]
            });

            const newId = createResult.Objects[0].Id;
            alert(`✅ Created new object: ${newId}`);
          } catch (err) {
            console.error('❌ Error duplicating original:', err);
            alert('Error duplicating original version. See console for details.');
          }
        }
      });
    }
  };
})();
