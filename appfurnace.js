// The following has/will be written so as to be as portable/appfurnace independent as possible
var appstate = {};
var currentdata = {};
var pollinterval;
var currentposinterval;
var accellID;
var trackingon = false;
init();

// Initiialisation
function init(){
    prepdataformat();
    setupstorage();
    loadLastSavedData();
    af.app.preventSleep(); 
    setscreenoutput();
}

// Start tracking when the user click the button
function startstoptracking() {
    if(trackingon===false){
        trackingon = true;
        // Start the accellerometer
        accelerometerStart();
        // Start the location sensor
        ui.but.text("Stop Tracking...");
        af.locationSensor.start();
        // Setup an interval to grab data    
        pollsensors();
        pollinterval = window.setInterval(pollsensors, 5000);
        // Setup an interval to send the current possition to the server.
        sendcurrentpos();
        currentposinterval = window.setInterval(sendcurrentpos, 10000);
    }else{
        ui.but.text("Start Tracking");
        trackingon = false;
        clearInterval(pollinterval);
        clearInterval(currentposinterval);
    }

}

// Prep data format
function prepdataformat(){  
    var currentTime = grabtime();
    currentdata = {
        "track" : { 
            "title": grabdatetime(), 
            "author": "", 
            "starttime": currentTime, 
            "endtime": currentTime, 
            "uploaded": 0, 
            "device":{
                "name": device.name,   
                "cordova": device.cordova,
                "platform": device.platform,
                "version": device.version,
                "uuid": device.uuid
            },
            "points" : {
              "elapsed"         : [], //  [1],[6],[11],[16]
              "gps"             : [], // [51.44911,-0.10858],[51.44911,-0.10858],[51.44911,-0.10858],[51.44911,-0.10858]
              "imagefile"      : [], // "name2.jpg",0,0,"name2.jpg
              "accelerometer"   : [], //  [11.4,44.6,55.2], [77.3,66.4,55.5], 0, [250.7,34.8,66.9]
              "shakeevent"   : []  // 0,1,0,0
            }
        }
    };
    appstate = {
        "currenttitle":currentdata.track.title,
        "cpos":0,
        "sub":0,
        "fails":0,
        "lat":0,
        "lng":0,
        "accell":0,
        "imagefile":0,
        "starttime":grabtime(),
        "elapsed":0,
        "shakeevent":0, 
        "posturl":"http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/index.php"  
   };
}

// MANAGING SENSORS
// Save current sensor output
function pollsensors() {
    // Set current state of sensor data
    grabgps();
    grabelapsed();
    grabaccellerometer();
    // Save data
    currentdata.track.points.elapsed.push(appstate.elapsed);
    currentdata.track.points.gps.push([appstate.lat,appstate.lng]);
    currentdata.track.points.accelerometer.push(appstate.accell); 
    currentdata.track.points.imagefile.push(appstate.imagefile);
    currentdata.track.points.shakeevent.push(appstate.shakeevent);
    // Reset relevent vars
    appstate.imagefile = 0;
    appstate.shakeevent = 0;
    // Save the current datastate
    saveCurrentData();
    // Set screen output    
    setscreenoutput();
}

// Update the screen output
function setscreenoutput(){
    ui.trackname.text('Title: '+currentdata.track.title);
    ui.points.text('Data: Uploaded: '+currentdata.track.uploaded+" Points: "+currentdata.track.points.elapsed.length);
    ui.cpos.text('Sent current position: '+appstate.cpos);
    ui.lat.text('lat: '+appstate.lat);
    ui.lng.text('lng: '+appstate.lng);
    ui.elapsed.text('Elapsed Secs: '+Math.round(appstate.elapsed/1000)  ); 
    ui.uuid.text("uuid: "+device.uuid);
}

// Grab GPS data: TODO: 1. Check gps is on, if not then alert 2. Make Appfurnace Independent 3. Smooth data
function grabgps() {
    var latlng = af.locationSensor.getLastLocation();
    appstate.lat = latlng.y;
    appstate.lng = latlng.x;
}

// Grab accelleromter data: TODO: write it
function grabaccellerometer(){
   appstate.accell = 0; 
}

// Start the accellerometer
function accelerometerStart() {
    accellID = navigator.accelerometer.watchAcceleration(
            // Success
            function (acell){
                // acell.x;
                // acell.y;
                // acell.z;
                // acell.timestamp;
                /* alertme(acell.x+acell.y+acell.z);
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
                */
            }, 
            // Error
            function (e){ 
                console.log("accel fail (" + ex.name + ": " + ex.message + ")");
            },
            // Options
            {frequency:3000} 
        );
}

// Grab accelleromter data: TODO: write it
function grabimagefile(){
   appstate.imagefile = 0; 
}

// Calculate elapsed time
function grabelapsed() {
    var currentime = grabtime();
    appstate.elapsed = currentime-appstate.starttime; 
}

// Grab the current date
function grabdatetime(){
    var myDate = new Date();
    var y = myDate.getFullYear();
    var m = myDate.getMonth();
    var d = myDate.getDate();
    var h = myDate.getHours();
    var mi = myDate.getMinutes();
    var s = myDate.getSeconds();
    return y+'-'+m+'-'+d+'_'+h+'-'+mi+'-'+s;
}

// Grab the number of milliseconds since midnight Jan 1, 1970
function grabtime(){
    var myTime = new Date();
    return myTime.getTime();
}

// UPLOADING AND SAVING DATA
// Post data to server
function postdata(){
    ui.uploadbut.text('Uploading...'); 
    // Post it
    $.ajax({
        url: appstate.posturl+"?q=savedata&uuid="+device.uuid, 
        type:"post",
        data: { 
            vars:JSON.stringify(currentdata)
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){ 
            appstate.fails++;
            var msg = ' e:'+XMLHttpRequest.statusText+" s:"+textStatus+" et:"+errorThrown;
            ui.failed.text('Fails:'+appstate.fails+msg);
            ui.uploadbut.text('Upload Data'); 
        },
        success: function(data){
            appstate.sub++;
            currentdata.track.uploaded = currentdata.track.points.elapsed.length;
            ui.sub.text('Uploaded:'+appstate.sub+" msg: "+data); 
            ui.points.text('Data: Uploaded: '+currentdata.track.uploaded+" Points: "+currentdata.track.points.elapsed.length);
            ui.uploadbut.text('Upload Data');
            ui.failed.text('Fails:'+appstate.fails);
        }
    }); 
}
 
// Send current position to the server: 
function sendcurrentpos(){
    $.ajax({
        url: appstate.posturl+"?q=savelivedevice&uuid="+device.uuid+"&la="+appstate.lat+"&lo="+appstate.lng+'&dn='+currentdata.track.device.name,
        error: function(XMLHttpRequest, textStatus, errorThrown){ 
            ui.cpos.text('Current position: failed to send');  
        },
        success: function(data){
            appstate.cpos++;          
        }
    }); 
}

// Print an alert to the screen
function alertme(msg, title){
    popup(msg, title);
}

// MANAGEING MEDIA MEDIA
function takePhoto() {
    navigator.camera.getPicture(photoSuccess, photoFail, { quality: 15, destinationType : 0 });   
}
// Called when taking a photo works, 
function photoSuccess(imageString) {
    if (imageString && imageString.length > 100) {
        ui.takepicbut.backgroundImage( "data:image/jpeg;base64," + imageString );
        savephoto(imageString, "newimg.jpg");
        // TODO: here's where you'd upload the contents of the imageString variable to your server.
    }
}
function photoFail(message) {

}
function savephoto(imageString, filepath){
    var fileTransfer = new FileTransfer();
    fileTransfer.download(
        url,
        filePath,
        function(entry) {
            console.log("download complete: " + entry.fullPath);
        },
        function(error) {
            console.log("download error source " + error.source);
            console.log("download error target " + error.target);
            console.log("upload error code" + error.code);
        }
    );
}

// STORED DATA OPTIONS
function setupstorage(){
    // If this is the first time, set up the default values
    if (af.storedData === null) {
        af.storedData = {}; // init storedData to a blank object
        af.storedData.vars = [];
        af.storedData.appstate = {};
        af.saveStoredData();
    }
}


// Save current data
function saveCurrentData(){
    var ref = 0;
    af.storedData.vars[ref] = currentdata;
    af.storedData.appstate = appstate;
    af.saveStoredData(); 
    //alertme("Saved Len: "+af.storedData.vars.length , "Save data");
}

// Load last saved state
function loadLastSavedData(){
    appstate = af.storedData.appstate;
    var stored = af.storedData.vars.length;
    if(stored>0){
        currentdata = af.storedData.vars[stored-1];
        alertme(currentdata.track.title, 'Loaded last saved track');  
    }else{
        createnewtrack();   
    }
}

// Delete all data
function deletealldata(){
    af.storedData = null;
    af.saveStoredData(); 
    createnewtrack();
}

// Delete all data
function createnewtrack(){
    trackingon = true;
    startstoptracking();
    af.storedData = null;
    setupstorage();
    prepdataformat();
    setscreenoutput();
    alertme("Created new track", "Data");
    navigate.to('home');
}






