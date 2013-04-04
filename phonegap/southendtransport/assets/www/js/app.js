/*
 * Southend Transport Project
 */

var STP = STP || {};

STP.app = function(){

    // Encapsulation/closure.
    function App(){

        // -- Public
        // This config is selected on the phone at the start of the application.
        // If override is set then the selection is not offered.
        this.localconfig = {
            "override" : "null",
            "envs" : [
                "dev-gareth",
                "production"
            ],
            "domain"  : {
                "dev-gareth"    : "http://192.168.0.11/",
                "production"    : "http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/"
            }
        };

        // This is remote config. Pulled from the server when environment is choosen.
        this.config = {
            tickInterval: 1000, // millisecs
            recordInterval : 5,
            stopAfter : 120*60, // 2 hours maximum.
            activityTags : [
                "favourite route",
                "least favourites route",
                "most scenic route",
                "least scenic route"
            ],
            phonename   : "bob",
            domain      : "http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/",
            postUrls    : {
                data : ""
            }
        };

        // Empty data structure to be sent back to server.
        this.data = {
            "id"    : 0,
            "title"    : 0,
            "description" : "",
            "starttime": "",
            "device" : {
                "name": "",
                "cordova": "",
                "platform": "",
                "version": "",
                "uuid": "c8f95d649cd7addd"
            },
            "points" : {
                  "elapsed"         : [],
                  "gps"             : [],
                  "image"           : [],
                  "accelerometer"   : [],
                  "shakeeventyn"   : [],
            }
        };

        this.initialise = function() {

            console.log('init');
            // Other document events: 'load', 'deviceready', 'offline', and 'online'.
            if (navigator.userAgent.match(/(Android)/)) {
                document.addEventListener("deviceready", deviceReadyHandler, false);
            } else {
                  deviceReadyHandler(); //this is the browser
            }

        };

        this.time = STP.BindableModel( 'time' );
        this.image = STP.BindableModel( 'image' );
        this.sensors = {
            'geoloc'    : new STP.BindableModel( 'geoloc' ),
            'accel'     : new STP.BindableModel( 'accel' ),
            'ioio'     : new STP.BindableModel( 'ioio')
        };
        this.appstate = new STP.BindableModel( 'appstate' );

        this.switchCamera = function() {

            STP.plugins.switchCamera();

        },

        this.stopActivity = function() {
            // Stop the ticking!!!!!!
            clearInterval( tickId );
            this.writeData(function( e ) {
                    alert( 'Activity complete. Write successful.' );
                });
            STP.plugins.releaseCamera();

            $(".start").addClass("hide");
            $(".exit").removeClass("hide");
        };

        this.exitApplication = function() {

            navigator.app.exitApp(); 

        };

        this.chooseEnv = function() {

            selectEnvironment();

        };

        this.writeData = function( successHandler ) {
            // Write to file.
            activityDataEntry.createWriter(function( writer ) {

                    writer.onwrite = successHandler;
                    writer.write( JSON.stringify( self.data ) );

                }, writeErrorHandler );

        };

        this.startActivity = function() {

            // Set start time.
            var now = new Date();
            self.time.set( 'start', Math.round( now.getTime()/1000 ) );
            self.time.set( 'start-str', now.toUTCString() );
            self.data['starttime'] = self.time.get("start-str");

            var startTicking = function() { 
                if( dataFileCreated === true && cameraReady === true ){
                    tickId = setInterval(tickHandler, self.config.tickInterval);
                }
            };

            STP.plugins.prepareCamera(function(result) {
                    console.log( result.action + " (success)" );
                    cameraReady = true;
                    startTicking();
                },
                function( e ) {
                    cameraErrorHandler("Prepare camera failed: " + e); 
                });

            createActivityFile(function(){
                    dataFileCreated = true;
                    startTicking();
                });

        };

        // -- Private
        var self = this,
            dataFileCreated = false,
            cameraReady = false,
            cameraBusy = false,
            watchId = -1,
            tickId = -1,
            dataDirEntry = {}, // stp root data DirectoryEntry
            activityDirEntry = {}, // activity DirectoryEntry
            activityDataEntry = {}, // rawjson.json FileEntry
            previousReading = {},
            mAccel = 0.00,
            mAccelCurrent = 9.80665,
            mAccelLast = 9.80665,
            uploadedcnt = 0, 
            posturl = self.domain + "index.php",  

            documentReadyHandler = function() {

                document.addEventListener("pause", function() {
                    console.log( "EVENT: PAUSE!");
                    }, false);

                document.addEventListener("RESUME", function() {
                    console.log( "EVENT: RESUME!");
                    }, false);

            },

            deviceReadyHandler = function() {

                initialise();
                getConfig();

            },

            selectEnvironment = function() {

                // Populate available envs.
                var $select = $("#environments");
                $select[0].options[0] = new Option("Select an environment");
                $select[0].options[0].value = "Select an environment";
                for (var i = 0; i < self.localconfig.envs.length; i++) {
                    $select[0].options[i+1] = new Option(self.localconfig.envs[i]);
                    $select[0].options[i+1].value = self.localconfig.envs[i];
                };

                // Show.
                $(".environment").show();

                // Listen for change, set env and get config.
                var onChangeHandler = function() {
                    $("option:selected", $select).each(function () {
                        var env = $(this).val();
                        setDomain( env );
                        getConfig();
                    });
                    // Remove listener.
                    $select.off("change", onChangeHandler);
                };
                $select.on("change", onChangeHandler);

            },

            setDomain = function( env ) {

                self.config.domain = self.localconfig.domain[env];

            },

            getConfig = function() {

                $("#environments").blur().empty();
                $(".environment").hide();

                var deviceConfig = "config/" + self.data.device.uuid + ".json";
                $.getJSON(self.config.domain + deviceConfig,
                        function( remoteconfig ) {
                            parseConfig( remoteConfig );
                            alert( "Config updated from location: "
                                + self.config.domain + deviceConfig );
                        })
                        .fail(function() { 
                            alert( "Config not found at this location: "
                                + self.config.domain + deviceConfig );
                        });

            },
            
            parseConfig = function( remoteconfig ) {

                // Extend config.
                $.extend(self.config, remoteconfig);
                // Add phonename (from remote config) to data.
                self.data.phonename = remoteconfig.phonename;

            },

            initialise  = function() {

                // Handle docready separate to deviceready.
                $(document).ready( documentReadyHandler );

                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, fsSuccessHandler, fsErrorHandler);
                
                self.data.device.name = device.name;
                self.data.device.platform = device.platform;
                self.data.device.version = device.version;
                self.data.device.uuid = device.uuid;
                self.data.description = document.getElementById("description").value;
                
                // Configuration. - URL for config shouldn't matter 
                // because the config is in GIT and should be the same everywhere.

                // Defaults.
                self.sensors['geoloc'].set( 'lat', 0 );
                self.sensors['geoloc'].set( 'lon', 0 );
                self.sensors['geoloc'].set( 'count', 0 );
                self.sensors['ioio'].set( 'ioio-str', 0 );
                self.time.set( 'start', -1 );
                self.time.set( 'last-record', -1 );
                self.appstate.set( 'uploadedcnt-str', uploadedcnt);
                self.appstate.set( 'deviceid-name', self.data.device.uuid + " | " + self.config.phonename);

                //geoLocateUpdate();

                // START AYSYNCHRONOS DATA/SENSOR/UPLOAD POLLING
                // GeoLocate
                gpsTid = setInterval(geoLocateUpdate, 500);
                // Send current position back to server.
                posTid = setInterval(sendcurrentpos, 10000);
                sendcurrentpos();
                // Upload current data track to the server.
                //posTid = setInterval(postFullData, 10000);
                
                // Get the accelerometer going
                accelerometerStart();
                // And grab those sensors!
                ioioStart();

            },

            enableStart = function() {

                $(".start").removeClass( "hide" );

            },

            tickHandler = function() {

                updateTime();

                var duration = self.time.get( 'duration' ),
                    lastRecord = self.time.get( 'last-record' );

                // If recordInterval has elapsed since last record
                // then record data/take picture.
                if ( self.time.get( 'last-record') < 0 ||
                    duration-lastRecord  >= self.config.recordInterval ) {

                    // Record data now!
                    self.data.points.elapsed.push( self.time.get('duration') );
                    self.data.points.gps.push([ self.sensors['geoloc'].get( 'lat' ), self.sensors['geoloc'].get( 'lon' ) ]);
                    var imagename = self.time.get( 'now' ) + '.jpg';
                    self.data.points.image.push( imagename );
                    var accel = self.sensors['accel'];
                    self.data.points.accelerometer.push(accel.get( 'combined' ));
                    self.data.points["shakeeventyn"].push(accel.get( 'shake' ));
                    
                    // Write data at every interval in case of crash, etc.
                    self.writeData(function() { console.log( "Data written successfully" ); });
                    // Might as well upload it as well
                    postFullData();

                    // If camera is not busy take picture.
                    if ( cameraReady === true && cameraBusy === false ) {
                        takePicture( imagename );
                    } else {
                        if ( cameraReady === false ) {
                            cameraErrorHandler( 'not ready' );
                        } else {
                            cameraErrorHandler( 'camera busy' );
                        }

                    }

                    // Reset.
                    self.time.set( 'last-record', duration );

                }

                if( self.time.get('duration') >= self.config.stopAfter ) {
                    self.stopActivity();
                }
            },

            updateTime = function() {

                var now = new Date();
                self.time.set( 'now', Math.round( now.getTime()/1000 ) );

                self.time.set( 'now-str', now.toUTCString() );
                // Determine activity duration if its started.
                if ( self.time.get('start') > 0) {
                    var duration = self.time.get( 'now' ) - self.time.get( 'start' );
                    self.time.set( 'duration', duration );
                }

            },

            geoLocateStart = function() {
                //watchID = navigator.geolocation.watchPosition(geoSuccessHandler, geoErrorHandler);
                watchID=navigator.geolocation.watchPosition(
                    geoSuccessHandler, 
                    geoErrorHandler, 
                    {enableHighAccuracy:true}
                );
            },

            geoLocateUpdate = function() {
                watchID=navigator.geolocation.getCurrentPosition(
                    geoSuccessHandler, 
                    geoErrorHandler 
                    //,{enableHighAccuracy:true}
                );
            },

            geoLocateStop = function() {
                navigator.geolocation.clearWatch(watchID);
            },

            geoSuccessHandler = function( position ) {
                var geoloc = self.sensors['geoloc'];
                // only update the GPS count if we have recieved new coords
                if(position.coords.latitude!=geoloc.get( 'lat') && position.coords.longitude!=geoloc.get( 'lon')) {
                   geoloc.set( 'lat', position.coords.latitude );
                    geoloc.set( 'lon', position.coords.longitude );
                    geoloc.set( 'count', geoloc.get('count')+1 ); 
                }
            },

            accelerometerStart = function() {
                var options = {};
                options.frequency = 1000;
                accelerationWatch = navigator.accelerometer.watchAcceleration(
                        accelUpdateHandler, function(ex) {
                            console.log("accel fail (" + ex.name + ": " + ex.message + ")");
                        }, options);
            },

            accelUpdateHandler = function(a) {

                var accel = self.sensors['accel'];
                accel.set( 'x', a.x );
                accel.set( 'y', a.y );
                accel.set( 'z', a.z );
                accel.set( 'combined', a.x+":"+a.y+":"+a.z );

                var delta = 0.00;
                
                mAccelLast = mAccelCurrent;
                mAccelCurrent = Math.sqrt((a.x*a.x + a.y*a.y + a.z*a.z));
                delta = mAccelCurrent - mAccelLast;
                mAccel = mAccel * 0.9 + delta; // perform low-cut filter
      
                if( mAccel > 1.75 ) { 
                    accel.set( 'shake', "true" );
                } else {
                    accel.set( 'shake', "false" );
                }
                
            },
            
            
            // Send current position to the server:
            sendcurrentpos = function (){

                var geoloc = self.sensors['geoloc'],                
                    lat = geoloc.get( "lat" ),
                    lng = geoloc.get( "lon" );

                $.ajax({
                    url: posturl+"?q=savelivedevice&uuid="+self.data.device.uuid+"&la="+lat+"&lo="+lng+'&dn='+device.name,
                    error: function(XMLHttpRequest, textStatus, errorThrown){
                        geoloc.set( "message", "N" );
                    },
                    success: function(data){
                        geoloc.set( "message", "Y" );
                        console.log( "send successful" );
                    }
                });
            },

            // Post data to server
            postFullData = function(){
                self.appstate.set( 'uploadedcnt-str', uploadedcnt);
                uploadedcnt++;
                /*
                $.ajax({
                    url: posturl+"?q=savedata&uuid="+device.uuid, 
                    type:"post",
                    data: { 
                        vars:JSON.stringify(self.data)
                    },
                    error: function(XMLHttpRequest, textStatus, errorThrown){ 
                        //appstate.fails++;
                        var msg = ' e:'+XMLHttpRequest.statusText+" s:"+textStatus+" et:"+errorThrown;
                        //ui.failed.text('Fails:'+appstate.fails+msg);
                        //ui.uploadbut.text('Upload Data'); 
                    },
                    success: function(data){
                        //appstate.sub++;
                        //currentdata.track.uploaded = currentdata.track.points.elapsed.length;
                        //ui.sub.text('Uploaded:'+appstate.sub+" msg: "+data); 
                        //ui.points.text('Data: Uploaded: '+currentdata.track.uploaded+" Points: "+currentdata.track.points.elapsed.length);
                        //ui.uploadbut.text('Upload Data');
                        //ui.failed.text('Fails:'+appstate.fails);
                    }
                });
                */                 
            },

            takePicture = function( filename ) {

                var params = [
                    activityDirEntry.fullPath.replace('file://',''),
                    filename
                ];

                cameraBusy = true;

                STP.plugins.takePicture(params,
                    function( result ) {
                        console.log( result.action +" (success)", result.filename );
                        cameraBusy = false;
                    }, cameraErrorHandler);

            },

            // IOIO: Start communications with the IOIO board
            ioioStart = function() {
                var interval = 1000;
                var ioioInterval = window.setInterval(ioioUpdate, interval);
                ioioStartup();
            },

            // IOIO: Startup the main IOIO thread
            ioioStartup = function(){
                var params = [];
                STP.plugins.ioioStartup(params,
                    function(result) {
                        self.sensors['ioio'].set('ioio-str', 'IOIO: '+result);
                        //console.log("IOIO Sucess: "+result);
                    }, 
                    function(err){
                        console.log("IOIO Error: "+err);
                    }
                );
            },

            // IOIO: Grab data from the ioio board if its available
            ioioUpdate = function(){
                var params = ["Sent from .js!!"];
                STP.plugins.ioioIsAlive(params,
                    function(result) {
                        self.sensors['ioio'].set('ioio-str', 'IOIO: '+result);
                        //console.log("IOIO Sucess: "+result);
                    }, 
                    function(err){
                        console.log("IOIO Error: "+err);
                    }
                );
            },

            // File system accessed.
            fsSuccessHandler = function( fileSystem ) {

                var rootEntry = fileSystem.root,
                rootSuccessHandler = function( dirEntry ) {

                    console.log("Directory created successfully: " + dirEntry.name );
                    // Get or create data directory.
                    dirEntry.getDirectory(device.uuid, { create : true },
                        function( uuidDirEntry ) {
                            console.log("Directory created successfully: " + uuidDirEntry.name );
                            dataDirEntry = uuidDirEntry;
                            enableStart();
                        },
                        fsErrorHandler );
                };

                // Get or create data directory.
                rootEntry.getDirectory('southendtransportdata', { create : true },
                    rootSuccessHandler, fsErrorHandler );

            },

            createActivityFile = function( successCallback ) {

                // Create directory with new id
                self.data.title = new Date().toFormattedString();
                dataDirEntry.getDirectory( self.data.title, { create : true },
                    function( dirEntry ) {

                        console.log( 'Successfully create dir: ' + dirEntry.name );
                        activityDirEntry = dirEntry;

                        activityDirEntry.getFile("data.json", { create: true }, function( fileEntry ) {
                            activityDataEntry = fileEntry;
                            console.log( 'success:' + activityDataEntry.fullPath );
                            // Success callback starts tick.
                            successCallback();

                        });

                    }, fsErrorHandler );

            },

            cameraErrorHandler = function( msg ) {
                alert( 'Camera error: ' + msg );
            },
            writeErrorHandler = function( msg ) {
                alert( 'Write error:' + String(msg) );
            },
            fsErrorHandler = function( msg ) {
                alert( 'Filesystem error:' + String(msg) );
            },
            geoErrorHandler = function( msg ) {
                alert( 'Geolocation error' + msg );
            };


    }; // End App()

    return new App();
};



/*
 * Generic model that allows DOM data binding.
 */
STP.BindableModel = function( uid ) {
    var binder = new UTIL.DataBinder( uid ),

        model = {
            attributes: {},

            // The attribute setter publish changes using the DataBinder PubSub
            set: function( attr_name, val ) {
                this.attributes[ attr_name ] = val;
                binder.trigger( uid + ":change", [ attr_name, val, this ] );
            },

            get: function( attr_name ) {
                return this.attributes[ attr_name ];
            },

            _binder: binder
        };

    // Subscribe to the PubSub
    binder.on( uid + ":change", function( evt, attr_name, new_val, initiator ) {
        if ( initiator !== model ) {
            model.set( attr_name, new_val );
        }
    });

    return model;
};


/*
 * Plugins
 */
STP.plugins = STP.plugins || {};

STP.plugins.prepareCamera = function(callbackSuccess, callbackError) {
    cordova.exec(callbackSuccess, callbackError, "CameraAccessNoUserAction", "prepareCamera", []);
};

STP.plugins.takePicture = function(params, callbackSuccess, callbackError) {
    cordova.exec(callbackSuccess, callbackError, "CameraAccessNoUserAction", "takePicture", params);
};

STP.plugins.releaseCamera = function() {
    cordova.exec(function(){
            console.log("stoppedSuccessfully");
        }, function(){
            alert("stoppedError");
        }, "CameraAccessNoUserAction", "releaseCamera", []);
};

STP.plugins.switchCamera = function(callbackSuccess, callbackError) {
    cordova.exec(callbackSuccess, callbackError, "CameraAccessNoUserAction", "switchCamera", []);
};

/* Functions for the IOIO plugin. 
 * Check the following is added to "res/xml/config": 
 *    <plugin name="IOIO" value="uk.org.opensystem.plugin.IOIOconnect"/>
 * And that a file exists called  at src/org/opensystem/plugin/IOIOconnect.java
 */
STP.plugins.ioioIsAlive = function(params, callbackSuccess, callbackError) {
    cordova.exec(
        callbackSuccess, 
        callbackError, 
        "IOIOconnect", // References java file: IOIOconnect.java
        "ioioIsAlive", // Action to perform
        params
    );
};
STP.plugins.ioioStartup = function(params, callbackSuccess, callbackError) {
    cordova.exec(
        callbackSuccess, 
        callbackError, 
        "IOIOconnect", // Refereneces java file: IOIOconnect.java
        "ioioStartup", // Action to perform
        params
    );
};


/*
 * Utilities - not project specific.
 */
var UTIL = UTIL || {};

/*
 * Allows for simple 2 way binding of DOM elements to a model.
 */
UTIL.DataBinder = function( object_id ) {
    // Use a jQuery object as simple PubSub
    var pubSub = jQuery({});

    // We expect a `data` element specifying the binding
    // in the form: data-bind-<object_id>="<property_name>"
    var data_attr = "bind-" + object_id,
        message = object_id + ":change";

    // Listen to change events on elements with the data-binding attribute and proxy
    // them to the PubSub, so that the change is "broadcasted" to all connected objects
    jQuery( document ).on( "change", "[data-" + data_attr + "]", function( evt ) {
        var $input = jQuery( this );

        pubSub.trigger( message, [ $input.data( data_attr ), $input.val() ] );
    });
    // PubSub propagates changes to all bound elements, setting value of
    // input tags or HTML content of other tags

    pubSub.on( message, function( evt, prop_name, new_val ) {
        jQuery( "[data-" + data_attr + "=" + prop_name + "]" ).each( function() {
            var $bound = jQuery( this );

            if ( $bound.is("input, textarea, select") ) {
                $bound.val( new_val );
            } else {
                $bound.html( new_val );
            }
        });
    });

    return pubSub;
}

// Pad integer with zeros. returns string.
UTIL.pad = function( number, digits ) {
    return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
}

/*
 * Extending native  prototypes
 */
String.prototype.padLeft = function (length, character) { 
    return new Array(length - this.length + 1).join(character || ' ') + this; 
};

Date.prototype.toFormattedString = function () {
    return [
        String(this.getFullYear()),
        String(this.getMonth()+1).padLeft(2, '0'),
        String(this.getDate()).padLeft(2, '0'),
        String(this.getHours()).padLeft(2, '0'),
        String(this.getMinutes()).padLeft(2, '0'),
        String(this.getSeconds()).padLeft(2, '0')
            ].join("-");
};
