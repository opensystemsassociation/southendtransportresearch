/*
 * Southend Transport Project
 */

var STP = STP || {};

STP.app = function(){

    // Encapsulation/closure.
    function App(){

        // -- Public
        this.config = {
            activityType: 001,
            activityId: 001,
            tickInterval: 1000, // millisecs
            recordInterval : 5,
            stopAfter : 120*60, // 2 hours maximum.
            dirPrefix : "track"
        };

        this.data = {
            "id"    : 0,
            "description" : "",
            "start-time": "",
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
                  "image"           : [],
                  "accelerometer"   : [],
                  "shakeevent-yn"   : [],
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

            /* DEBUGGING */
            /*
            geoSuccessHandler( {
                coords : {
                    latitude : 20,
                    longitude : 40
                },
                timestamp : new Date().now
            } );
            */

        };

        this.time = STP.BindableModel( 'time' );
        this.image = STP.BindableModel( 'image' );
        this.sensors = {
            'geoloc'    : new STP.BindableModel( 'geoloc' ),
            'accel'     : new STP.BindableModel( 'accel' ),
            'ioio'     : new STP.BindableModel( 'ioio')
        };

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
            self.data['start-time'] = self.time.get("start-str");

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

            documentReadyHandler = function() {

                document.addEventListener("pause", function() {
                    console.log( "EVENT: PAUSE!");
                    }, false);

                document.addEventListener("RESUME", function() {
                    console.log( "EVENT: RESUME!");
                    }, false);

            },

            deviceReadyHandler = function() {

                // Handle docready separate to deviceready.
                $(document).ready( documentReadyHandler );

                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, fsSuccessHandler, fsErrorHandler);
                
                self.data.device.name = device.name;
                self.data.device.platform = device.platform;
                self.data.device.version = device.version;
                self.data.device.uuid = device.uuid;
                self.data.description = document.getElementById("description").value;
                
                // Defaults.
                self.sensors['geoloc'].set( 'lat', 0 );
                self.sensors['geoloc'].set( 'lon', 0 );
                self.sensors['geoloc'].set( 'count', 0 );
                self.sensors['ioio'].set( 'ioio-str', 0 );
                self.time.set( 'start', -1 );
                self.time.set( 'last-record', -1 );

                // Start asynchronos sensor polling
                geoLocateStart();
                accelerometerStart();
                ioioStart();
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
                    self.data.points["shakeevent-yn"].push(accel.get( 'shake' ));
                    
                    // Write data at every interval in case of crash, etc.
                    self.writeData(function() { console.log( "Data written successfully" ); });

                    // Send current position back to server.
                    sendcurrentpos();

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
                watchID = navigator.geolocation.watchPosition(geoSuccessHandler, geoErrorHandler);
            },

            geoLocateStop = function() {
                navigator.geolocation.clearWatch(watchID);
            },

            geoSuccessHandler = function( position ) {
                var geoloc = self.sensors['geoloc'];
                geoloc.set( 'lat', position.coords.latitude );
                geoloc.set( 'lon', position.coords.longitude );
                geoloc.set( 'count', geoloc.get('count')+1 );
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
                    posturl = "http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/index.php",
                    lat = geoloc.get( "lat" ),
                    lng = geoloc.get( "lon" );

                $.ajax({
                    url: posturl+"?q=savelivedevice&uuid="+device.uuid+"&la="+lat+"&lo="+lng,
                    error: function(XMLHttpRequest, textStatus, errorThrown){
                        ui.cpos.text('Current position: failed to send');
                        geoloc.set( "message", "Failed to send" );
                        setTimeout(function() {
                                geoloc.set( "message", "" );
                            }, 2000);
                    },
                    success: function(data){
                        geoloc.set( "message", "Geoloc sent successfully." );
                        setTimeout(function() {
                                geoloc.set( "message", "" );
                            }, 2000);
                        console.log( "send successful" );
                    }
                });
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

            // File system
            fsSuccessHandler = function( fileSystem ) {

                // Determine next ID based on existing directories.
                var rootEntry = fileSystem.root,

                    rootSuccessHandler = function( dirEntry ) {

                        var directoryReader = dirEntry.createReader();
                        directoryReader.readEntries(function( entries ) {
                            // Loop through existing directories and get highest id from names.
                            self.data.id = 0;
                            for(var i=0; i < entries.length; i++) {
                                console.log(entries[i].name);
                                if(entries[i].isDirectory) {
                                    var currId = parseInt( entries[i].name.replace(self.config.dirPrefix, '') );
                                    // console.log(entries[i].name.replace(self.config.dirPrefix, '') );
                                    // console.log( parseInt( entries[i].name.replace(self.config.dirPrefix, '')) );
                                    // console.log( currId );
                                    if( currId > self.data.id ) {
                                        self.data.id = currId;
                                    }
                                }
                            }
                            self.data.id++;
                            // Store parent to create dir later with activity id.
                            dataDirEntry = dirEntry;

                            alert( "Please note down activity id: " + self.data.id );

                        }, fsErrorHandler );

                    };

                rootEntry.getDirectory('southendtransportdata', { create : true },
                    rootSuccessHandler, fsErrorHandler );

            },

            createActivityFile = function( successCallback ) {

                // Create directory with new id
                dataDirEntry.getDirectory(self.config.dirPrefix + self.data.id, { create : true },
                    function( dirEntry ) {

                        console.log( 'Successfully create dir: ' + dirEntry.name );
                        activityDirEntry = dirEntry;

                        activityDirEntry.getFile("rawdata.json", { create: true }, function( fileEntry ) {
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