(() => {
    /**
     * Horizontal line, divider.
     */
    ContentStationSdk.createAction({
        isLine: true,
    });

    /**
     * Action that will log in console all available data, including:
     * - selection
     * - dossier (if available)
     * - info
     */
    ContentStationSdk.createAction({
        title: 'Console.log all data',
        onAction: (selection, dossier) => {
            console.log('user clicked the custom context menu item');
            console.log('> selection:', selection);
            console.log('> dossier:', dossier);
            console.log('> logon info:', ContentStationSdk.getInfo());
        },
    });

    /**
     * An example how to use 'onInit' handler and disable the action, in this case in multiselect.
     */
    ContentStationSdk.createAction({
        title: 'Disabled in multiselect',
        onInit: (config, selection) => {
            config.isDisabled = selection.length > 1;
        },
    });

    /**
     * An example how to use 'onInit' handler and change the title on the action based on selection.
     */
    ContentStationSdk.createAction({
        onInit: (config, selection) => {
            config.title = `Selection: ${selection.length} file(s)`;
        },
    });

    /**
     * Notification example.
     */
    ContentStationSdk.createAction({
        title: 'Simple notification',
        onAction: () => {
            ContentStationSdk.showNotification({
                content: 'Simple notification from <i>custom context menu action</i>.',
            });
        },
    });

    /**
     * An example of dynamic submenu.
     * Every selected file is mapped to a submenu action, which will console.log filename on click.
     */
    ContentStationSdk.createAction({
        title: 'Dynamic submenu',
        onInit: (config, selection) => {
            config.submenu = selection.map((file) => {
                return {
                    title: file.Name,
                    onAction: () => {
                        console.log(file.Name);
                    },
                };
            });
        },
    });

    /**
     * This action line will be enabled for File.Type 'Image' and in single selection only.
     * The second, commented line of code, has the same condition, but would remove the action from context menu instead of disabling it.
     */
    ContentStationSdk.createAction({
        title: 'Enabled for single Image',
        onInit: (config, selection) => {
            config.isDisabled = selection.length > 1 || selection[0].Type !== 'Image';
            // config.isRemoved = selection.length > 1 || selection[0].Type !== 'Image';
        },
        onAction: (selection) => {
            alert(`Hello, this is an Image with name: "${selection[0].Name}".`);
        },
    });

    /**
     * Other available SDK methods.
     */
    ContentStationSdk.createAction({
        title: 'Other actions',
        onInit: (config, selection, dossier) => {
            config.submenu = [
                {
                    title: 'Refresh current search',
                    onAction: () => {
                        ContentStationSdk.refreshCurrentSearch();
                    },
                },
                {
                    title: 'Refresh selected files',
                    onAction: () => {
                        ContentStationSdk.refreshObjects(
                            selection.map((file) => {
                                return file.ID;
                            }),
                        );
                    },
                },
                {
                    title: 'Inject files in dossier',
                    onInit: (configInjectFiles) => {
                        configInjectFiles.isDisabled = dossier === undefined;
                    },
                    onAction: () => {
                        ContentStationSdk.injectObjectsInDossier(dossier.ID, [
                            {
                                MetaData: {
                                    BasicMetaData: {
                                        ID: Math.floor(Math.random() * 100000).toString(),
                                        Name: 'INJECTED FILE',
                                    },
                                },
                            },
                        ]);
                    },
                },
            ];
        },
    });

    /**
     * This line will be available in Dossier only.
     */
    ContentStationSdk.createAction({
        isLine: true,
        onInit: (config, selection, dossier) => {
            config.isRemoved = dossier === undefined;
        },
    });

    /**
     * This action line will be available in Dossier only.
     */
    ContentStationSdk.createAction({
        title: 'Only visible in Dossier',
        onInit: (config, selection, dossier) => {
            config.isRemoved = dossier === undefined;
        },
    });

    /**
     * Attach global callbacks for signin and signout events.
     */
    ContentStationSdk.onSignin((info) => {
        console.log('[sample-1] Sigin callback.', info);
        if (info && !info.Ticket) {
            console.log('Ticket is not available since Content Station is using cookie based authentication');
        }
    });

    ContentStationSdk.onSignout(() => {
        console.log('[sample-1] Sigout callback.');
    });

    /**
     * Buttons - use current dossier and selection
     */
    ContentStationSdk.addDossierToolbarButton({
        onInit: (button) => {
            button.label = 'Test';
        },
        onAction: (button, selection, dossier) => {
            console.log('selection:', selection);
            console.log('dossier:', dossier);
            ContentStationSdk.showNotification({
                content: `Selected ${selection.length} file(s). Dossier's name is '${dossier.Name}'. Check browser's console for more information.`,
            });
        },
    });

    /**
     * Buttons - set label on initialization and on action
     */
    ContentStationSdk.addDossierToolbarButton({
        onInit: (button) => {
            button.label = 'Dynamic label';
        },
        onAction: (button) => {
            button.label = `Dynamic label(${Math.floor(Math.random() * 98) + 1})`;
        },
    });

    /**
     * Buttons - disable property
     */
    ContentStationSdk.addDossierToolbarButton({
        label: 'Disabled',
        isDisabled: true,
    });

    /**
     * Buttons - isRemoved property
     */
    ContentStationSdk.addDossierToolbarButton({
        label: 'Hidden',
        isRemoved: true,
        onInit: (button) => {
            // Show button on initialization
            button.isRemoved = false;
        },
        onAction: (button) => {
            // Hide button on click
            button.isRemoved = true;
        },
    });

    /**
     * Buttons - dynamically add new
     */
    ContentStationSdk.addDossierToolbarButton({
        label: 'Add',
        onAction: (button) => {
            this.addDossierToolbarButton({
                label: `New(${Math.floor(Math.random() * 98) + 1})`,
                onAction: (newButton) => {
                    newButton.isRemoved = true;
                },
            });
        },
    });
})();
