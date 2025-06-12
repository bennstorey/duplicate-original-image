//version 3.0
//implementaiton url: https://bennstorey.github.io/duplicate-original-image/fetchOriginalImage.js

// Duplicate Image Plugin with Upload + CreateObjects
(function waitForStudioAPI() {
  if (!window.contentstationExtensionApi || !window.contentstationExtensionApi.registerPlugin) {
    console.log('[Duplicate Image Plugin] Waiting for Studio SDK...');
    return setTimeout(waitForStudioAPI, 100);
  }

  const { registerPlugin, showToast } = window.contentstationExtensionApi;

  registerPlugin('duplicate-original-image', context => {
    console.log('[Duplicate Image Plugin] Plugin loaded');

    context.dossier.registerToolbarButton({
      icon: 'copy',
      tooltip: 'Duplicate Original Image (v1)',
      async onClick(selection) {
        console.log('[Duplicate Image Plugin] Toolbar button clicked');

        if (!selection?.length || selection[0].type !== 'Image') {
          showToast('Please select a single image object.');
          return;
        }

        const original = selection[0];
        const ticket = context.session.ticket;
        const serverUrl = context.session.studioServerUrl;

        try {
          // Step 1: Fetch original binary
          const fileUrl = original.files[0]?.fileUrl;
          const binary = await fetch(fileUrl + '&ticket=' + encodeURIComponent(ticket)).then(r => r.blob());

          // Step 2: Upload via UploadFile
          const uploadResponse = await window.entApi.callMethod('UploadFile', [{ Ticket: ticket }], binary);
          const uploadedFileUrl = serverUrl + uploadResponse?.path;
          console.log('[UploadFile] Uploaded to:', uploadedFileUrl);

          // Step 3: Build CreateObjects payload
          const newName = 'web_' + original.name;
          const createPayload = {
            method: 'CreateObjects',
            id: '1',
            params: [
              {
                Ticket: ticket,
                Lock: false,
                Objects: [
                  {
                    __classname__: 'Object',
                    MetaData: {
                      BasicMetaData: {
                        Name: newName,
                        Type: 'Image',
                        Publication: original.publication,
                        Category: original.category,
                        __classname__: 'BasicMetaData'
                      },
                      WorkflowMetaData: {
                        State: original.state,
                        __classname__: 'WorkflowMetaData'
                      },
                      ContentMetaData: {
                        Format: 'image/jpeg',
                        __classname__: 'ContentMetaData'
                      },
                      ExtraMetaData: original.extraMetaData,
                      __classname__: 'MetaData'
                    },
                    Files: [
                      {
                        Rendition: 'native',
                        Type: 'image/jpeg',
                        FileUrl: uploadedFileUrl,
                        __classname__: 'Attachment'
                      }
                    ],
                    Relations: [
                      {
                        Parent: original.dossierId,
                        Type: 'Contained',
                        Targets: [],
                        __classname__: 'Relation'
                      }
                    ]
                  }
                ]
              }
            ],
            jsonrpc: '2.0'
          };

          const response = await fetch(serverUrl + '/json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload)
          }).then(r => r.json());

          if (response?.result?.Objects?.length) {
            showToast('Image duplicated successfully.');
            console.log('[CreateObjects] Success:', response);
          } else {
            console.error('[CreateObjects] Failed:', response);
            showToast('Failed to create duplicate image.');
          }

        } catch (error) {
          console.error('[Duplicate Image Plugin] Error:', error);
          showToast('An error occurred during duplication.');
        }
      }
    });
  });
})();
