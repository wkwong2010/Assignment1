/*
 * Load files *locally* (GeoJSON, KML, GPX) into the map
 * using the HTML5 File API.
 *
 * Requires Pavel Shramov's GPX.js
 * https://github.com/shramov/leaflet-plugins/blob/d74d67/layer/vector/GPX.js
 */
var FileLoader = L.Class.extend({
    includes: L.Mixin.Events,
    options: {
        layerOptions: {}
    },

    initialize: function (map,layersControl, options) {
        this._map = map;
	   this.layerctrl  = null;
	   this.filename = null;
		layerctrl = layersControl;
        L.Util.setOptions(this, options);

        this._parsers = {
            'geojson': this._loadGeoJSON,
            'gpx': this._convertToGeoJSON,
            'kml': this._convertToGeoJSON
        };
    },
    load: function (file /* File */) {
        // Check file extension
        var ext = file.name.split('.').pop(),
            parser = this._parsers[ext];
        if (!parser) {
            window.alert("Unsupported file type " + file.type + '(' + ext + ')');
            return;
        }
        // Read selected file using HTML5 File API
        var reader = new FileReader();
        reader.onload = L.Util.bind(function (e) {
            this.fire('data:loading', {filename: file.name, format: ext});
            var layer = parser.call(this, e.target.result, ext);
            this.fire('data:loaded', {layer: layer, filename: file.name, format: ext});
        }, this);
        reader.readAsText(file);
		fileName = file.name.split('.');
        return reader;
    },

    _loadGeoJSON: function (content) {
        if (typeof content == 'string') {
            content = JSON.parse(content);
        }
		
		var geojson =  L.geoJson(content, this.options.layerOptions);
		//integrate leaflet dvf plugin - call up choroplethDatalayer 
		var choroplethLayer = new L.ChoroplethDataLayer(content, {
		recordsLayer: 'features',
		locationMode: L.LocationModes.GEOJSON,
		maxZoom: 18,
		getMarker: function (latlng, layerOptions, record) {
			return new L.MapMarker(latlng, layerOptions);
		},	
		layerOptions: {
			gradient: true,
			fillOpacity: 0.8,
			weight: 1.0,
			opacity: 1.0,
			color: '#09FF00'
		},
		displayOptions: {
				// 'properties.OBJECTID': {
					// //displayName: '"OBJECTID"',
					// fillColor: new L.HSLSaturationFunction(new L.Point(40, 60), new L.Point(50, 0), {
						// outputHue: 240
					// }),
					// color: new L.HSLSaturationFunction(new L.Point(40, 50), new L.Point(50, 90), {
						// outputHue: 240,
						// outputLuminosity: '35%'
					// })
				// }
		}
	});
		
				 
		//var geojsonLayer = new L.ChoroplethDataLayer(geojson, opt);
			//layerctrl.addOverlay(geojson,"A");
			return  choroplethLayer.addTo(this._map);
    },

    _convertToGeoJSON: function (content, format) {
        // Format is either 'gpx' or 'kml'
        if (typeof content == 'string') {
            content = ( new window.DOMParser() ).parseFromString(content, "text/xml");
        }
        var geojson = toGeoJSON[format](content);
        return this._loadGeoJSON(geojson);
    },
	returnFileName: function(){
		return fileName[0];
	}
});



//create function on map
L.Control.FileLayerLoad = L.Control.extend({
    statics: {
        TITLE: 'Load GeoJSON file',
        LABEL: '&#8965;'
    },
    options: {
        position: 'topleft',
        fitBounds: true,
        layerOptions: {}
    },
	
    initialize: function (layersControl,options) {
        L.Util.setOptions(this, options);
        this.loader = null;
		this.layerctrl = null;
		layerctrl = layersControl;
    },

    onAdd: function (map) {
        this.loader = new FileLoader(map,layerctrl, {layerOptions: this.options.layerOptions});

        this.loader.on('data:loaded', function (e) {
           // Fit bounds after loading
            if (this.options.fitBounds) {
                window.setTimeout(function () {
                    map.fitBounds(e.layer.getBounds()).zoomOut();
                }, 500);
			layerctrl.addOverlay(e.layer, this.loader.returnFileName());	
            }
        }, this);
		

		
		
		

        // Initialize Drag-and-drop
        this._initDragAndDrop(map);

        // Initialize map control
        return this._initContainer();
    },

    _initDragAndDrop: function (map) {
        var fileLoader = this.loader,
            dropbox = map._container;

        var callbacks = {
            dragenter: function () {
                map.scrollWheelZoom.disable();
            },
            dragleave: function () {
                map.scrollWheelZoom.enable();
            },
            dragover: function (e) {
                e.stopPropagation();
                e.preventDefault();
            },
            drop: function (e) {
                e.stopPropagation();
                e.preventDefault();

                var files = Array.prototype.slice.apply(e.dataTransfer.files),
                    i = files.length;
                setTimeout(function(){
                    fileLoader.load(files.shift());
                    if (files.length > 0) {
                        setTimeout(arguments.callee, 25);
                    }
                }, 25);
                map.scrollWheelZoom.enable();
            }
        };
        for (var name in callbacks)
            dropbox.addEventListener(name, callbacks[name], false);
    },

    _initContainer: function () {
        // Create a button, and bind click on hidden file input
        var zoomName = 'leaflet-control-filelayer leaflet-control-zoom',
            barName = 'leaflet-bar',
            partName = barName + '-part',
            container = L.DomUtil.create('div', zoomName + ' ' + barName);
        var link = L.DomUtil.create('a', zoomName + '-in ' + partName, container);
        link.innerHTML = L.Control.FileLayerLoad.LABEL;
        link.href = '#';
        link.title = L.Control.FileLayerLoad.TITLE;

        // Create an invisible file input
        var fileInput = L.DomUtil.create('input', 'hidden', container);
        fileInput.type = 'file';
        fileInput.accept = '.gpx,.kml,.geojson';
        fileInput.style.display = 'none';
        // Load on file change
        var fileLoader = this.loader;
        fileInput.addEventListener("change", function (e) {
            fileLoader.load(this.files[0]);
        }, false);

        var stop = L.DomEvent.stopPropagation;
        L.DomEvent
            .on(link, 'click', stop)
            .on(link, 'mousedown', stop)
            .on(link, 'dblclick', stop)
            .on(link, 'click', L.DomEvent.preventDefault)
            .on(link, 'click', function (e) {
                fileInput.click();
                e.preventDefault();
            });
        return container;
    }
});

L.Control.fileLayerLoad = function (layersControl,options) {
    return new L.Control.FileLayerLoad(layersControl,options);
};
