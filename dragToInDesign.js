 /*
    * Drag & Drop files from Content Station to InDesign 
    * 
    * A button is added to the top toolbar of the dossier, the button can be dragged to InDesign. 
    * - One file: The file is placed 
    * - Multiple files: The files are added to the placegun
    * 
    * Note
    * This plugin assumes that the server url returned by the Content Station SDK matches the server url 
    * configured for InDesign. Please update createDragData if this is not the case. 
    */  
    
    const D2ID_LABEL = "Drag to InDesign";  
    const D2ID_HINT_TEXT = "Tip: Please drag & drop this button to InDesign";

    ContentStationSdk.addDossierToolbarButton({
        onInit: function(button, selection) {        
            button.label = D2ID_LABEL + ' (' + selection.length + ')';

            $("span:contains('" + D2ID_LABEL + "')").each(function () {                
                $(this).attr("draggable",true);
                $(this).bind("dragstart", function(ev){
                  ev.originalEvent.dataTransfer.setData("text",  d2id_createDragData(selection));
                });                         
            });            
        },
        onAction: function(button, selection, dossier) {
            ContentStationSdk.showNotification({                
                type: 'info',
                content: D2ID_HINT_TEXT
            });

        }
    });

    /**
     * Returns the url of the server
     */
    function d2id_getEnterpriseURL()
    {	
	    var info = ContentStationSdk.getInfo();
	    return info.ServerInfo.URL;
    }   

    /*
    * Create the drag data based on the selected files
    */
    function d2id_createDragData (selection) {

        var dragData = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><WWPlaceInfo>\n";

        dragData += "<ServerURL>" + d2id_getEnterpriseURL() + "</ServerURL>\n";
        selection.forEach (function (item, index) {
            dragData += "<WWObject>\n";
            dragData += "   <ID>" + item.ID + "</ID>\n";
            dragData += "   <Type>" + item.Type +"</Type>\n";
            dragData += "   <Format>" + item.Format +"</Format>\n";
            dragData += "   <GUID/>\n";
            dragData += "</WWObject>\n";
        });        

        dragData += "</WWPlaceInfo>";

        //console.log('dragData:', dragData);
        return dragData;

    }
