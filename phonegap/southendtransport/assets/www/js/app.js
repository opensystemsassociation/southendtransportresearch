/*
 * Southend Transport Project
 */

var STP = STP || {};

STP.app = function(){

    // Encapsulation/closure.
    function App(){

        /* =======================================================
        *  SETUP DEFAULT VARIABLES
        * ======================================================= 
        */
        // Select where data tracks are sent to
        this.localconfig = {
            "override" : "null",
            "envs" : [
                "production",
                "dev-gareth",
                "dev-gareth-local"
                
            ],
            "domain"  : {
                "production"    : "http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/",
                "dev-gareth"    : "http://garethfoote.co.uk/osa/stp/maps/",
                "dev-gareth-local"    : "http://192.168.1.75/leaflet-map-deep/"
            }
        };

        // Phone config. These values are utalised, then over-ridden by the file on the remote server
        this.config = {
            whichgps : "currentpos",        // Select the type of GPS recording [watch, currentpos] 
            tickInterval: 1000,       // millisecs
            distanceThreshold: 1000,  // Meters - discard lat/lon further than this distance
            accelSensitivity: 3.0,    // Threshold to trigger an accel event
            recordInterval : 5,
            geoUpdateInterval : 2000,
            sendCurrPosInterval : 10000,
            stopAfter : 120*60, // 2 hours maximum.
            activityTags : [
                "Take image every 5 seconds",
                "Take image on Accellerometer event",
                "Take image on GSR event",
                "Take image on Light event"
            ],
            postUrls    : {
                live : "index.php?q=savelivedevice",
                data : "index.php?q=savedata"
            },
            phonename   : "none set",
            domain      : "http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/"
        };

        // Initial data structure recording a track
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
                "uuid": ""
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

        /* =======================================================
        *  SETUP SCREEN OUTPUT (Binds variables to hteml elements)
        * ======================================================= 
        */
        this.time = STP.BindableModel( 'time' );
        this.image = STP.BindableModel( 'image' );
        this.appstate = new STP.BindableModel( 'appstate' );
        this.sensors = {
            'geoloc' : new STP.BindableModel( 'geoloc' ),
            'accel'  : new STP.BindableModel( 'accel' ),
            'ioio'   : new STP.BindableModel( 'ioio')
        };

        /* =======================================================
        *  MANAGE THE MAIN ACTIVITY
        * ======================================================= 
        */
        // Initialise the app
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

        // Start recording a new data track
        this.startActivity = function() {
            // Check if a description has been enetred
            var description = document.getElementById("description"),
                lat = self.sensors['geoloc'].get( 'lat' ),
                lon = self.sensors['geoloc'].get( 'lon' );
            if(description.value==""){
                alert("Please enter a track description");
                return;
            }
            if(lat==-1 && lon==-1){
                alert("GPS not set, please wait for values to be set and/or check your GPS settings.");
                return;                
            }
            // Set start time.
            var now = new Date();
            self.time.set( 'start', Math.round( now.getTime()/1000 ) );
            self.time.set( 'start-str', now.toUTCString() );
            self.data['starttime'] = self.time.get("start-str");
            // Start the 5 sec recording of sensors
            var startTicking = function() { 
                if( dataFileCreated === true && cameraReady === true ){
                    tickId = setInterval(tickHandler, self.config.tickInterval);
                }
            };
            // Prepare the camera
            STP.plugins.prepareCamera(function(result) {
                    console.log( result.action + " (success)" );
                    cameraReady = true;
                    // when the camera is ready, start the data track
                    startTicking();
                },
                function( e ) {
                    cameraErrorHandler("Prepare camera failed: " + e); 
                });
            // ???
            createActivityFile(function(){ 
                dataFileCreated = true;
                startTicking();                
            });
        };

        // Now stop the activity
        this.stopActivity = function() {
            // Stop the ticking!!!!!
            clearInterval( tickId );
            this.writeData(function( e ) { alert( 'Activity complete. Write successful.' ); });
            STP.plugins.releaseCamera();

            $(".start").addClass("hide");
            $(".exit").removeClass("hide");
        };

        // Now exit the application
        this.exitApplication = function() {
            navigator.app.exitApp(); 
        };

        /* =======================================================
        *  GENERAL UTILITIES
        * ======================================================= 
        */
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
        this.switchCamera = function() {
            STP.plugins.switchCamera();
        };

        /* =======================================================
        *  PRIVATE VARS
        * ======================================================= 
        */
        var self = this,
            isDevice = false,
            dataFileCreated = false,
            cameraReady = false,
            cameraBusy = false,
            watchId = -1,
            startedGeowatch = -1,
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

            /* =======================================================
            *  ARE WE READY?
            * ======================================================= */
            
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

            /* =======================================================
             *  CONFIGERATION
             * ======================================================= 
             */
             // Which server shall we send data to/
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
                        self.config.domain = self.localconfig.domain[env];
                        getConfig();
                    });
                    // Remove listener.
                    $select.off("change", onChangeHandler);
                };
                $select.on("change", onChangeHandler);

            },
            // Grab the config file from the server
            getConfig = function() {
                $("#environments").blur().empty();
                $(".environment").hide();
                //var deviceConfig = "config/" + self.data.device.uuid + ".json";
                var deviceConfig = "config/allphones.json";
                $.getJSON(self.config.domain + deviceConfig,
                        function( remoteconfig ) {
                            parseConfig( remoteconfig );
                            alert( "Config updated from location: "+ self.config.domain + deviceConfig );
                            populateTrackTags(); 
                        })
                        .fail(function() { 
                            alert( "Config not found at this location: "+ self.config.domain + deviceConfig );
                        });
                populateTrackTags(); 
            },
            // Now its downloaded, lets save some data from it
            parseConfig = function( remoteconfig ) {
                // Extend config.
                $.extend(self.config, remoteconfig);
                // Add phonename (from remote config) to data
                var name = self.data.device.uuid;
                var grabname = remoteconfig.phonename[name];
                if(grabname=='' || grabname==null) grabname = 'Not set';
                // Now set the domain
                self.data.phonename = grabname;             
                self.appstate.set( 'devicename', grabname);
            },
            // And fill the 'select a tag' dropdown with the selection
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
                    self.data.tag = $("#tags option:selected").val();
                    
                    // Defaults.
                    self.sensors['geoloc'].set( 'lat', -1 );
                    self.sensors['geoloc'].set( 'lon', -1 );
                    self.sensors['geoloc'].set( 'count', 0 );
                    self.sensors['accel'].set( 'shake', 0 );
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

                    // Get the accelerometer going
                    accelerometerStart();

                    // And lets grab those IOIO sensors!
                    ioioStart();

                    // Upload current data track to the server.
                    //posTid = setInterval(postFullData, 10000);
                }


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
                    points.gps_accuracy.push( self.sensors['geoloc'].get( 'accuracy' ) );
                    points.gps_timestamp.push( self.sensors['geoloc'].get( 'timestamp' ));
                    points.dist.push(self.sensors['geoloc'].get( 'dist' ));

                    // Save the accell data
                    var accel = self.sensors['accel'];
                    var shake = accel.get( 'shake' );
                    points.accelerometer.push(accel.get( 'combined' ));
                    points.shakeevent.push(shake);
                    self.data.description = document.getElementById("description").value+" GPSt:"+self.config.whichgps;
                    
                    // Add IOIO values to the track
                    points.IOIOlight.push( self.sensors['ioio'].get( 'ioio-ldr') );
                    points.IOIOlightevent.push( self.sensors['ioio'].get( 'ioio-ldrevent') );
                    points.IOIOgsr.push( self.sensors['ioio'].get( 'ioio-gsr') );
                    points.IOIOgsrevent.push( self.sensors['ioio'].get( 'ioio-gsrevent') );   

                    // Reset accel shake.
                    accel.set('shake', 0);

                    // Select the trigger for taking a picture
                    var imagename = 0; 
                    var newevent = 0;
                    switch($("#tags option:selected").val()){
                        case "Take image on Accellerometer event" :
                            if(accel.get('shake')==1) newevent = 1;
                            break;
                        case "Take image on GSR event" :
                            if( self.sensors['ioio'].get( 'ioio-gsrevent') == 1) newevent = 1;
                            break;
                        case "Take image on Light event" :
                            if(self.sensors['ioio'].get( 'ioio-ldrevent') == 1) newevent = 1;
                            break;
                        case "Take image every 5 seconds":
                            newevent = 1;
                            break;
                        default:
                            newevent = 1;
                    }
                    if(newevent==1){
                        imagename = self.time.get( 'now' ) + '.jpg';
                        tryToTakePicture(imagename);
                    }
                    points.image.push( imagename );

                    // Reset stored events
                    accel.set('shake', 0);
                    IOIOgsrStored = 0,
                    IOIOlightStored = 0;

                    // Write data at every interval in case of crash, etc.
                    self.writeData(function() { console.log( "Data written successfully" ); });

                    // Might as well upload it as well.
                    postFullData();

                    // Reset.
                    self.time.set( 'last-record', duration );

                }

                if( self.time.get('duration') >= self.config.stopAfter ) {
                    self.stopActivity();
                }
            },

            // If camera is not busy take picture.
            tryToTakePicture = function(imagename){        
                var myimagename = imagename;
                if ( cameraReady === true && cameraBusy === false ) {
                    takePicture( myimagename );
                } else {
                    if ( cameraReady === false ) {
                        cameraErrorHandler( 'not ready' );
                    } else {
                        cameraErrorHandler( 'camera busy' );
                    }

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
                var options = { 
                    timeout: 1000, // Max time to try to obtain a Geo location
                    enableHighAccuracy: true, // true/false to get most accrate reading
                    maximumAge: 10000 // Don't get points older than this (avoids caching issues)
                };
                // Select which type of gps track to record
                if(self.config.whichgps=="watch" && startedGeowatch<0){
                    watchID=navigator.geolocation.watchPosition(
                        geoSuccessHandler, 
                        geoErrorHandler,
                        options
                    );
                    startedGeowatch = 1; 
                }
                if(self.config.whichgps=="currentpos"){
                    watchID=navigator.geolocation.getCurrentPosition(
                        geoSuccessHandler, 
                        geoErrorHandler, 
                        options
                    ); 
                }
            },
            geoSuccessHandler = function( position ) {
                var distanceThreshold = self.config.distanceThreshold,
                    geoloc = self.sensors['geoloc'],
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
                    //geoloc.set( 'count', geoloc.get('count')+1 ); 
                } else if( 
                        distance <= distanceThreshold &&
                        position.coords.latitude != geoloc.get( 'lat') && 
                        position.coords.longitude != geoloc.get( 'lon') 
                         )  {
                            // only update the GPS count if we have recieved new coords
                            geoloc.set( 'lat', kalman.getLat() );
                            geoloc.set( 'lon', kalman.getLong() );
                            geoloc.set( 'accuracy', position.coords.accuracy );
                            geoloc.set( 'timestamp', position.timestamp );
                            geoloc.set( 'count', geoloc.get('count')+1 );
                }
            },
            geoErrorHandler = function( msg ) {
                if( isDevice ) {
                   // alert( 'Geolocation error' + msg );
                } else {
                    // console.log( 'Geolocation error' + msg );
                }
            },

            /* =======================================================
             *  ACCELEROMETER
             * ======================================================= 
             */
            accelerometerStart = function() {
                var options = {};
                options.frequency = 100;
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
                    shakeThreshold = self.config.accelSensitivity; //2.8; // This indicates a shake. accelSensitivity
                    mAccelLast = mAccelCurrent;
                    mAccelCurrent = Math.sqrt((a.x*a.x + a.y*a.y + a.z*a.z));
                    delta = mAccelCurrent - mAccelLast;
                    mAccel = mAccel * 0.9 + delta; // perform low-cut filter
      
                // Accel interval is shorter than tick interval. 
                // Sooo shake is reset to 0 each time the tick grabs the shake event
                // Trigger an IOIO output if we find a shake event
                if(mAccel > shakeThreshold
                        && mAccel-shakeThreshold > accel.get('shake')) {
                    accel.set( 'shake', (mAccel-shakeThreshold).toFixed(4) );
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
                    filename,
                    200 // max pixel width
                ];
                cameraBusy = true;
                STP.plugins.takePicture(params,
                    function( result ) {
                        console.log( result.action +" (success)", result.filename );
                        cameraBusy = false;
                    }, cameraErrorHandler);
            },
            cameraErrorHandler = function( msg ) {
                console.log( 'Camera error: ' + msg );
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
            // IOIO: Startup the main IOIO thread
            ioioStartup = function(){
                var params = [250]; // [threadsleep]
                STP.plugins.ioioStartup(params,
                    function(result) {
                        self.sensors['ioio'].set('ioio-str', 'IOIO: '+result);;
                    }, 
                    function(err){
                        console.log("IOIO Error: "+err);
                    }
                );
            },
            // IOIO: Start async communications with the IOIO board
            ioioStart = function() {
                var ioioInterval = window.setInterval(ioioGrabData, 3000); // Grab IOIO data every 1/2 sec 500
                //var intercasgs = window.setInterval( function() {alert(self.IOIOgsrStored) }, 4000);
                ioioStartup();
            },
            // IOIO: Grab data from the ioio board if its available
            ioioGrabData = function(){;
                $('#sensorstr').text("GPS Type: "+self.config.whichgps+" Tag: "+$("#tags option:selected").val());
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
            /* IOIO: Send a message to IOIO board
               Message options: 
                    The default is for the Java to trigger an outputs.
                    If stopautotriggers is sent as a message, this javascript controls outputs
                    msg = "stopautotriggers";   // Stop auto triggers 
                    msg = "startautotriggers";  // Start auto triggers 
                    msg = "a46_playpwm"         // Make pin a46 play a randomly generated sequence
                    msg = "a38_playpwm"         // Make pin a38 play a randomly generated sequence
                    msg = "a37_playpwm"         // Make pin a37 play a randomly generated sequence
            */
            ioioSendMessage = function(msg){
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
                            $(".start").removeClass( "hide" );
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
                alert("An error has occurred: Code = " + error.code);
                console.log(" File upload error. Source: " + error.source + " / Target: " + error.target);
            },
            writeErrorHandler = function( msg ) {
                console.log( 'Write error:' + String(msg) );
            },
            fsErrorHandler = function( msg ) {
                console.log( 'Filesystem error:' + String(msg) );
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
