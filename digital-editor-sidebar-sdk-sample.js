(async function (DigitalEditorSdk) {
    const icons = [
        {
            normal: '../sdk/samples/assets/properties.svg',
            activated: '../sdk/samples/assets/properties-activated.svg',
        },
        {
            normal: '../sdk/samples/assets/lock.svg',
            activated: '../sdk/samples/assets/lock-activated.svg',
        },
    ];

    class PanelService {
        constructor(article) {
            this.article = article;
            this.panels = [];
            this.activePanelData = null;
            this.editData = null;
        }

        create() {
            const createPanel = function () {
                const document = this.panel.window.document;

                this.header = document.createElement('p');
                document.body.appendChild(this.header);

                this.list = document.createElement('div');
                this.list.style.lineHeight = '1.7em';
                document.body.appendChild(this.list);
            };

            const updatePanel = function (editor, content) {
                if (!this.panel.window) {
                    return;
                }

                this.header.innerHTML = `panel ${this.key}.${this.counter}`;

                if (editor && content) {
                    this.list.innerHTML = '';

                    const document = this.panel.window.document;

                    content.data.content.forEach((component) => {
                        const componentEl = document.createElement('div');
                        componentEl.innerHTML = `${component.identifier} ${component.id}`;
                        componentEl.onclick = async () => {
                            const result = await editor.focusComponent({ componentId: component.id });
                            if (!result) {
                                console.warn(editor.getErrorMessage());
                            }
                        };
                        this.list.appendChild(componentEl);
                    });
                }
            };

            const destroyPanel = function () {
                clearInterval(this.updater);
            };

            const panelData = {
                key: this.panels.length + 1,
                counter: 0,
                panel: this.article.addSidebarPanel({
                    onInit: (panel) => {
                        this.activePanelData = panelData;
                        panelData.createPanel();
                        panelData.updatePanel(...this.editData);
                    },
                    onDestroy: (panel) => {
                        panelData.destroyPanel();
                        this.activePanelData = null;
                    },
                    button: {
                        badge: 1000,
                        icon: icons[0],
                    },
                }),
            };
            panelData.createPanel = createPanel.bind(panelData);
            panelData.updatePanel = updatePanel.bind(panelData);
            panelData.destroyPanel = destroyPanel.bind(panelData);

            panelData.updater = setInterval(
                function () {
                    this.counter++;
                    this.panel.button.badge = this.counter;
                    this.panel.button.tooltip = `tooltip ${this.key}.${this.counter}`;
                    this.panel.button.icon = icons[this.counter % 4 === 0 ? 0 : 1];
                    this.updatePanel();
                }.bind(panelData),
                1000,
            );
            this.panels.push(panelData);
        }

        update(editData) {
            this.editData = editData;
            if (this.activePanelData) {
                this.activePanelData.updatePanel(...editData);
            }
        }

        toggle() {
            this.panels.forEach((panelData) => (panelData.panel.button.hide = !panelData.panel.button.hide));
        }
    }

    function getJson(article) {
        return new Promise((resolve, reject) => {
            try {
                article.getJson(function (json) {
                    resolve(json);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    DigitalEditorSdk.onOpenArticle(async function (article) {
        const panelService = new PanelService(article);
        panelService.create();

        article.addToolbarButton({
            label: 'Toggle Panels',
            onAction: function (button) {
                panelService.toggle();
            },
        });
        article.addToolbarButton({
            label: 'Create Panel',
            onAction: function (button) {
                panelService.create();
            },
        });

        article.onSave(async function () {
            panelService.update([article.getEditor(), await getJson(article)]);
        });
        panelService.update([article.getEditor(), await getJson(article)]);
    });
})(DigitalEditorSdk);

//# sourceURL=digital-editor-side-bar-sdk-sample.js
