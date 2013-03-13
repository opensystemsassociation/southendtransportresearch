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
            recordInterval : 5 //secs
        };

        this.initialise = function() {

            console.log('init');
            // Other document events: 'load', 'deviceready', 'offline', and 'online'.
            if (navigator.userAgent.match(/(Android)/)) {
                  document.addEventListener("deviceready", onDeviceReady, false);
            } else {
                  onDeviceReady(); //this is the browser
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

        this.sensors = {
            'geoloc'    : new STP.BindableModel( 'geoloc' ),
            'accel'     : new STP.BindableModel( 'accel' )
        };

        this.startActivity = function() {

            var now = new Date();
            self.time.set( 'start', Math.round( now.getTime()/1000 ) );
            self.time.set( 'start-str', now.toUTCString() );

            setInterval(tickHandler, self.config.tickInterval);

        };

        // -- Private
        var self = this,
            cameraBusy = false,
            watchId = -1,

            onDeviceReady = function() {

                // Start sensor detection before starting activity.
                self.sensors['geoloc'].set( 'count', 0 );
                geoLocateStart();

                self.time.set( 'start', -1 );
                self.time.set( 'last-record', -1 );

            },

            // Beating heart of the application.
            tickHandler = function() {

                updateTime();

                var duration = self.time.get( 'duration' ),
                    lastRecord = self.time.get( 'last-record' );

                // If record interval has elapsed since last record
                // then record data/take picture.
                if ( self.time.get( 'last-record') < 0 ||
                    duration-lastRecord  >= self.config.recordInterval ) {
                    // Record data now!
                    console.log( duration );

                    // If camera is not busy take picture.
                    if ( cameraBusy === false ) {
                        takePicture();
                    } else {
                        alert( 'camerabusy' );
                    }

                    // Reset.
                    self.time.set( 'last-record', duration );

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

                console.log('geoLocateStart');
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

            geoErrorHandler = function() {
                alert( 'Geolocation error' );
            },

            takePicture = function() {

                var params = [
                    self.config.activityType + '_' + self.config.activityId,
                    self.time.get('now') + '.jpg'
                ];

                cameraBusy = true;

                window.takePicture(params,
                    function( fileName ) {

                        cameraBusy = false;
                        // TODO - Store the filename in xml.

                    },
                    function(error){
                        alert( error );
                    });

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
window.takePicture = function(params, callbackSuccess, callbackError) {
    cordova.exec(callbackSuccess, callbackError, "CameraAccessNoUserAction", "takePicture", params);
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

