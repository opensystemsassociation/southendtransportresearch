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
                "dev-gareth-local",
                "production"
            ],
            "domain"  : {
                "dev-gareth"    : "http://garethfoote.co.uk/osa/stp/maps/",
                "dev-gareth-local"    : "http://192.168.1.75/leaflet-map-deep/",
                "production"    : "http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/"
            }
        };

        // This is remote config. Pulled from the server when environment is choosen.
        this.config = {
            tickInterval: 1000, // millisecs
            recordInterval : 5,
            geoUpdateInterval : 500,
            sendCurrPosInterval : 10000,
            stopAfter : 120*60, // 2 hours maximum.
            activityTags : [
                "favourite route",
                "least favourites route",
                "most scenic route",
                "least scenic route"
            ],
            postUrls    : {
                live : "index.php?q=savelivedevice",
                data : "index.php?q=savedata"
            },
            phonename   : "bob",
            domain      : "http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/"
        };

        // Empty data structure to be sent back to server.
        this.data = {
            "id"     : 0,
            "title"  : 0,
            "tag"    : "",
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
                  "gps_accuracy"    : [],
                  "gps_timestamp"   : [],
                  "dist"            : [],
                  "image"           : [],
                  "accelerometer"   : [],
                  "shakeevent"   : [],
                  "IOIOlight"   : [],
                  "IOIOlightevent"   : [],
                  "IOIOgsr"   : [],
                  "IOIOgsrevent"   : [],
            }
        };

        this.initialise = function() {

            //console.log(UTIL.getDistance(51.50746, -0.12257, 51.81626, -0.8147));
            console.log('init');

            // Other document events: 'load', 'deviceready', 'offline', and 'online'.
            if (navigator.userAgent.match(/(Android)/)) {
                isDevice = true;
                document.addEventListener("deviceready", deviceReadyHandler, false);
            } else {
                isDevice = false;
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
                    writer.write( JSON.stringify( { track : self.data } ) );

                }, writeErrorHandler );

        };

        this.startActivity = function() {
            var description = document.getElementById("description");
            if(description.value==""){
                alert("Please enter a track description");
                return;
            }

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
            isDevice = false,
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
            IOIOgsrStored = 0,
            IOIOlightStored = 0,
            uploadedcnt = 0,
            kalman = new STP.KalmanLatLong(3),

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
                if( navigator.connection.type !== Connection.NONE
                        && navigator.connection.type !== Connection.UNKNOWN ) {
                    getConfig();
                } else {
                    populateTrackTags();
                }

                if( ! isDevice ){
                    parseConfig();
                }

            },

            selectEnvironment = function() {

                // Populate available envs.
                var $select = $("#environments");
                $select[0].options[0] = new Option("Select an environment");
                $select[0].options[0].value = "select";
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
                        if( env === "select" ) {
                            return;
                        }
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
                            parseConfig( remoteconfig );
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
                self.appstate.set( 'devicename', remoteconfig.phonename);
                populateTrackTags(); 

            },

            populateTrackTags = function() {

                // Populate available envs.
                var $tags = $("#tags");
                $tags[0].options[0] = new Option("Select a tag...");
                $tags[0].options[0].value = "Select a tag...";
                for (var i = 0; i < self.config.activityTags.length; i++) {
                    $tags[0].options[i+1] = new Option(self.config.activityTags[i]);
                    $tags[0].options[i+1].value = self.config.activityTags[i];
                };

            },

            initialise  = function() {

                // Handle docready separate to deviceready.
                $(document).ready( documentReadyHandler );

                if( isDevice ) {
                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, fsSuccessHandler, fsErrorHandler);
                
                    self.data.device.name = device.name;
                    self.data.device.platform = device.platform;
                    self.data.device.version = device.version;
                    self.data.device.uuid = device.uuid;
                    self.data.description = document.getElementById("description").value;
                    self.data.tag = $("#tags option:selected").val();
                
                    // Defaults.
                    self.sensors['geoloc'].set( 'lat', -1 );
                    self.sensors['geoloc'].set( 'lon', -1 );
                    self.sensors['geoloc'].set( 'count', 0 );
                    self.sensors['accel'].set( 'shake', 0 );
                    self.sensors['ioio'].set( 'ioio-str', 0 );
                    self.sensors['ioio'].set( 'ioio-gsr', 0 );
                    self.sensors['ioio'].set( 'ioio-gsrevent', 0 );
                    self.sensors['ioio'].set( 'ioio-ldr', 0 );
                    self.sensors['ioio'].set( 'ioio-ldrevent', 0 );
                    self.time.set( 'start', -1 );
                    self.time.set( 'last-record', -1 );
                    self.appstate.set( 'uploadedcnt-str', uploadedcnt);
                    self.appstate.set( 'deviceid', self.data.device.uuid);
                    self.appstate.set( 'devicename', self.config.phonename);

                    // START AYSYNCHRONOS DATA/SENSOR/UPLOAD POLLING
                    // GeoLocate
                    gpsTid = setInterval(geoLocateUpdate, self.config.geoUpdateInterval);

                    // Send current position back to server.
                    posTid = setInterval(sendcurrentpos, self.config.sendCurrPosInterval);
                    sendcurrentpos();

                    // Upload current data track to the server.
                    //posTid = setInterval(postFullData, 10000);

                    // Get the accelerometer going
                    accelerometerStart();

                    // And lets grab those IOIO sensors!
                    ioioStart();
                }

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
                if ( self.time.get( 'last-record') < 0 || duration-lastRecord  >= self.config.recordInterval ) {

                    // Record data now! This involves taking values out of 
                    // respective models and putting into self.data.
                    var points = self.data.points;
                    points.elapsed.push( self.time.get('duration') );
                    points.gps.push([ self.sensors['geoloc'].get( 'lat' ), self.sensors['geoloc'].get( 'lon' ) ]);
                    points.gps_accuracy.push( self.sensors['geoloc'].get( 'accuracy' ));
                    points.gps_timestamp.push( self.sensors['geoloc'].get( 'timestamp' ));
                    points.dist.push(self.sensors['geoloc'].get( 'dist' ));
                    var imagename = self.time.get( 'now' ) + '.jpg';
                    points.image.push( imagename );
                    var accel = self.sensors['accel'];
                    var shake = accel.get( 'shake' );
                    points.accelerometer.push(accel.get( 'combined' ));
                    points.shakeevent.push(shake);
                    self.data.description = document.getElementById("description").value;
                    
                    // Add IOIO values to the track
                    points.IOIOlight.push( self.sensors['ioio'].get( 'ioio-ldr') );
                    points.IOIOlightevent.push( self.sensors['ioio'].get( 'ioio-ldrevent') );
                    points.IOIOgsr.push( self.sensors['ioio'].get( 'ioio-gsr') );
                    points.IOIOgsrevent.push( self.sensors['ioio'].get( 'ioio-gsrevent') );   

                    // Reset stored events
                    accel.set('shake', 0);
                    IOIOgsrStored = 0,
                    IOIOlightStored = 0;

                    // Write data at every interval in case of crash, etc.
                    self.writeData(function() { console.log( "Data written successfully" ); });

                    // Might as well upload it as well.
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

            /* =======================================================
             *  GPS COORDINATES
             * ======================================================= 
             */
            geoLocateUpdate = function() {
                watchID=navigator.geolocation.getCurrentPosition(
                    geoSuccessHandler, 
                    geoErrorHandler 
                    ,{enableHighAccuracy:true}
                );

            },
            geoSuccessHandler = function( position ) {
                var geoloc = self.sensors['geoloc'],
                    distance = UTIL.getDistance(geoloc.get('lat'), geoloc.get('lon'), position.coords.latitude, position.coords.longitude)*1000; // in metres.
                // console.log("DISTANCE: " + distance );
                kalman.process( position.coords.latitude, position.coords.longitude, position.coords.accuracy, position.timestamp );
                // Add distance to model.
                geoloc.set( 'dist', distance );
                if( geoloc.get('lat') == -1 && geoloc.get('lon') == -1 ){

                    geoloc.set( 'lat', kalman.getLat() );
                    geoloc.set( 'lon', kalman.getLong() );
                    geoloc.set( 'accuracy', position.coords.accuracy );
                    geoloc.set( 'timestamp', position.timestamp );
                    geoloc.set( 'count', geoloc.get('count')+1 ); 

                } else if( /* distance < maxDistInInterval 
                        && */ ( position.coords.latitude != geoloc.get( 'lat') 
                        && position.coords.longitude != geoloc.get( 'lon') ) ) {
                            // only update the GPS count if we have recieved new coords
                            geoloc.set( 'lat', kalman.getLat() );
                            geoloc.set( 'lon', kalman.getLong() );
                            geoloc.set( 'accuracy', position.coords.accuracy );
                            geoloc.set( 'timestamp', position.timestamp );
                            geoloc.set( 'count', geoloc.get('count')+1 );

                }
            },

            /* =======================================================
             *  ACCELEROMETER
             * ======================================================= 
             */
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
                accel.set( 'combined', (a.x).toFixed(4)+":"+(a.y).toFixed(4)+":"+(a.z).toFixed(4) );
                var delta = 0.00,
                shakeThreshold = 1.55; // 1.75 This indicates a shake.
                mAccelLast = mAccelCurrent;
                mAccelCurrent = Math.sqrt((a.x*a.x + a.y*a.y + a.z*a.z));
                delta = mAccelCurrent - mAccelLast;
                mAccel = mAccel * 0.9 + delta; // perform low-cut filter
      
                // Accel interval is shorter than tick interval. 
                // Sooo shake is reset to 0 each time the tick grabs the shake event
                if(mAccel > shakeThreshold) {
                    accel.set( 'shake', 1);
                    ioioSendMessage("a37_playpwm");
                }
            },

            /* =======================================================
             *  CAMERA
             * ======================================================= 
             */
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


            /* =======================================================
             *  UPLOAD DATA TO SERVER
             * ======================================================= 
             */
            // Send current position to the server:
            sendcurrentpos = function (){
                var geoloc = self.sensors['geoloc'],                
                    lat = geoloc.get( "lat" ),
                    lng = geoloc.get( "lon" );

                $.ajax({
                    url: self.config.domain + self.config.postUrls['live'] + "&uuid="+self.data.device.uuid+"&la="+lat+"&lo="+lng+'&dn='+device.name,
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
                var postUrl =  self.config.domain + self.config.postUrls['data'] + "&uuid="+self.data.device.uuid+"&title="+self.data.title;
                var options = new FileUploadOptions();
                options.fileKey="data";
                options.fileName=activityDataEntry.name;
                options.mimeType="text/json";

                var ft = new FileTransfer();
                ft.upload(activityDataEntry.fullPath, encodeURI( postUrl ), function(r) {
                        console.log("File transfer successful:" + r.response);
                    }, fileTransferErrorHandler, options);
            },


            /* =======================================================
             *  IOIO MANGEMENT
             * ======================================================= 
             */
            // IOIO: Start async communications with the IOIO board
            ioioStart = function() {
                //var ioioMsgInterval = window.setInterval(ioioSendMessage, 5000); // trigger IOIO data every 5 secs
                var ioioInterval = window.setInterval(ioioGrabData, 500); // Grab IOIO data every 1/2 sec
                //var intercasgs = window.setInterval( function() {alert(self.IOIOgsrStored) }, 4000);
                ioioStartup();
            },
            // IOIO: Startup the main IOIO thread
            ioioStartup = function(){
                var params = [250]; // [threadsleep]
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
            ioioGrabData = function(){
                // Trigger the IOIO if there has been an accelerometer event
                if(accel.get('shake')==1) ioioSendMessage("a37_playpwm");
                // Now lets see if there is new data
                var params = [""];
                STP.plugins.ioioGrabData(params,
                    function(result) {
                        // Grab the data and save it
                        var IOIOdata = jQuery.parseJSON( result );    
                        self.sensors['ioio'].set( 'ioio-ldr', IOIOdata.a44 );
                        self.sensors['ioio'].set( 'ioio-ldrevent', IOIOdata.a44Event );         
                        self.sensors['ioio'].set( 'ioio-gsr', IOIOdata.a43 );
                        self.sensors['ioio'].set( 'ioio-gsrevent', IOIOdata.a43Event );
                        
                        // Store the event until it is saved
                        if(IOIOdata.a43Event==1) self.IOIOgsrStored = 1;
                        if(IOIOdata.a44Event==1) self.IOIOlightStored = 1;

                        // Create strings of data to report 
                        var msg = "ldr["+IOIOdata.a44Event+"]:"+IOIOdata.a44+" "+
                                  "gsr["+IOIOdata.a43Event+"]:"+IOIOdata.a43;
                        self.sensors['ioio'].set('ioio-str', 'IOIO: '+msg);
                        //console.log("IOIO Sucess: "+result);
                    }, 
                    function(err){
                        console.log("IOIO Error: "+err);
                    }
                );
            },
            // IOIO: Send a message to IOIO board
            ioioSendMessage = function(msg){
                if(msg==null) msg = "a37_playpwm";
                /* Message options: 
                    The default is for the IOIO service to trigger
                    an output. If stopautotriggers is sent as a message, the javascript controls outputs
                    msg = "stopautotriggers";   // Stop auto triggers 
                    msg = "startautotriggers";  // Start auto triggers 
                    msg = "a46_playpwm"         // Make pin a46 play a randomly generated sequence
                    msg = "a38_playpwm"         // Make pin a38 play a randomly generated sequence
                    msg = "a37_playpwm"         // Make pin a37 play a randomly generated sequence
                */
                // Send the messag
                STP.plugins.ioioSendMessage(
                    [msg],
                    function(result) {
                        //console.log("IOIO Sucess: "+result);
                    }, 
                    function(err){
                        console.log("IOIO Error: "+err);
                    }
                );
            },


            /* =======================================================
             *  FILE SYSTEM  
             * ======================================================= 
             */
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

            /* =======================================================
             *  ERROR HANDLERS
             * ======================================================= 
             */
            fileTransferErrorHandler = function( error ) {
                // alert("An error has occurred: Code = " + error.code);
                console.log(" File upload error. Source: " + error.source + " / Target: " + error.target);
            },
            cameraErrorHandler = function( msg ) {
                console.log( 'Camera error: ' + msg );
            },
            writeErrorHandler = function( msg ) {
                console.log( 'Write error:' + String(msg) );
            },
            fsErrorHandler = function( msg ) {
                console.log( 'Filesystem error:' + String(msg) );
            },
            geoErrorHandler = function( msg ) {
                if( isDevice ) {
                    alert( 'Geolocation error' + msg );
                } else {
                    // console.log( 'Geolocation error' + msg );
                }
            };


    }; // End App()

    return new App();
};



/* =======================================================
*  DOM DATA BINDING
* ======================================================= 
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


/* =======================================================
*  PLUGIN MANGEMENT
* ======================================================= 
*/
STP.plugins = STP.plugins || {};

/* Methods for the camera plugin. */
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

/* Methods for the IOIO plugin. 
 * Check the following is added to "res/xml/config": 
 *    <plugin name="IOIO" value="uk.org.opensystem.plugin.IOIOconnect"/>
 * And that a file exists called  at src/org/opensystem/plugin/IOIOconnect.java
 */
 STP.plugins.ioioStartup = function(params, callbackSuccess, callbackError) {
    cordova.exec(
        callbackSuccess, 
        callbackError, 
        "IOIOconnect", // Refereneces java file: IOIOconnect.java
        "ioioStartup", // Action to perform
        params
    );
};
STP.plugins.ioioGrabData = function(params, callbackSuccess, callbackError) {
    cordova.exec(
        callbackSuccess, 
        callbackError, 
        "IOIOconnect", // References java file: IOIOconnect.java
        "ioioGrabData", // Action to perform
        params
    );
};
STP.plugins.ioioSendMessage = function(params, callbackSuccess, callbackError) {
    cordova.exec(
        callbackSuccess, 
        callbackError, 
        "IOIOconnect", // References java file: IOIOconnect.java
        "ioioSendMessage", // Action to perform
        params
    );
};
