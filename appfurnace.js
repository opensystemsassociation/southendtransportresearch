// The following has/will be written so as to be as portable/appfurnace independent as possible
var appstate = {};
var currentdata = {};
var pollinterval;
var currentposinterval;
var postfullinterval;
var imageinterval; 
var accellID;
var trackingon = false;
var currentImage = "";
init();

// Initiialisation
function init(){
    prepdataformat();
    setupstorage();
    loadLastSavedData();
    af.app.preventSleep(); 
    setscreenoutput();
    setupFilesystem();
}

// Start tracking when the user click the button
function startstoptracking() {
    setupFilesystem();
    if(ui.tag.text()===""){
        alert("Please enter a Track Description");
        return;
    }
    if(trackingon===false){
        trackingon = true;
        ui.but.text("Stop Tracking...");
        // Start the accellerometer
        accelerometerStart();
        // Start the location sensor
        af.locationSensor.start();
        // Setup an interval to grab data    
        pollsensors();
        pollinterval = window.setInterval(pollsensors, 5000);
        // Setup an interval to send the current possition to the server.
        sendcurrentpos();
        currentposinterval = window.setInterval(sendcurrentpos, 10000);
        // Setup an interval to upload full track data to the server
        postdata();
        postfullinterval = window.setInterval(postdata, 12000);
        // Setup an interval to upload images to the server
        postimages();
        imageinterval = window.setInterval(postimages, 4000);
    }else{
        ui.but.text("Start Tracking");
        trackingon = false;
        clearInterval(pollinterval);
        clearInterval(currentposinterval);
        clearInterval(postfullinterval);
        clearInterval(imageinterval);
    }

}

// Prep data format
function prepdataformat(){  
    var currentTime = grabtime();
    currentdata = {
        "track" : { 
            "title": "AF-"+grabdatetime(), 
            "tag":ui.tag.text(),
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
              "imagefile"       : [], // "name2.jpg",0,0,"name2.jpg
              "accelerometer"   : [], //  [11.4,44.6,55.2], [77.3,66.4,55.5], 0, [250.7,34.8,66.9]
              "shakeevent"      : []  // 0,1,0,0
            }
        }
    };
    appstate = {
        "currenttitle":currentdata.track.title,
        "lastimage":0,
        "imagecount":0,
        "imagesuploaded":0,
        "imageuploading":0,
        "imagemsg":"",
        "imagerrors":0,
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
        "posturl":"http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/index.php",
        "basedir":"/sdcard/southendtransportdata",
        "writetofile": true
   };
   var images = {};
   if(device.platform=="iPhone") appstate.writetofile = false;
}

// MANAGING SENSORS
// Save current sensor output
function pollsensors() {
    // Make sure the filesystem is setup
    setupFilesystem();
    // Set current state of sensor data
    grabgps();
    grabelapsed();
    grabaccellerometer();
    grabtag();
    // Save data
    currentdata.track.points.elapsed.push(appstate.elapsed);
    currentdata.track.points.gps.push([appstate.lat,appstate.lng]);
    currentdata.track.points.accelerometer.push(appstate.accell); 
    currentdata.track.points.imagefile.push(appstate.imagefile);
    currentdata.track.points.shakeevent.push(appstate.shakeevent);
    currentdata.track.points.imagefile.push(appstate.lastimage);
    currentdata.track.tag = appstate.tag;
    // Reset relevent vars
    appstate.imagefile = 0;
    appstate.shakeevent = 0;
    appstate.lastimage = 0;
    // Save the current datastate to the database
    saveCurrentData();
    // Save data to file
    writeFileToSDCard(JSON.stringify(currentdata), appstate.basedir+"/"+device.uuid+"/"+currentdata.track.title+"/data.json");
    // Set screen output    
    setscreenoutput();
}

// Update the screen output
function setscreenoutput(){
    ui.trackname.text('TrackID: '+currentdata.track.title);
    ui.points.text('Data points: '+currentdata.track.points.elapsed.length+' ul: '+currentdata.track.uploaded);
    ui.cpos.text('Sent current position: '+appstate.cpos);
    ui.lat.text('lat: '+appstate.lat);
    ui.lng.text('lng: '+appstate.lng);
    ui.xyz.text('xyz: '+appstate.accell);
    ui.elapsed.text('Elapsed Secs: '+Math.round(appstate.elapsed/1000)  ); 
    ui.uuid.text("uuid: "+device.uuid);
    ui.images.text('Images: '+appstate.imagecount+' ul:'+appstate.imagesuploaded+" e:"+appstate.imagerrors+" msg:"+appstate.imagemsg);
}

// Grab GPS data: TODO: 1. Check gps is on, if not then alert 2. Make Appfurnace Independent 3. Smooth data
function grabgps() {
    var latlng = af.locationSensor.getLastLocation();
    appstate.lat = latlng.y;
    appstate.lng = latlng.x;
}

// Grab the tag info
function grabtag() {
    appstate.tag = ui.tag.text(); 
}

// Grab accelleromter data: TODO: write it
function grabaccellerometer(){
   appstate.accell = 0; 
}

// Start the accellerometer
function accelerometerStart() {
    /*
    var options = {};
    options.frequency = 1000;
    accelerationWatch = navigator.accelerometer.watchAcceleration(
                        accelUpdateHandler, function(ex) {
                            console.log("accel fail (" + ex.name + ": " + ex.message + ")");
                        }, options);
    */  
}

// Grab image file: TODO: write it
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
    return y+'-'+m+'-'+d+'-'+h+'-'+mi+'-'+s;
}

// Grab the number of milliseconds since midnight Jan 1, 1970
function grabtime(){
    var myTime = new Date();
    return myTime.getTime();
}

// UPLOADING AND SAVING DATA
// Post data to server
function postdata(){
    ui.uploadbut.text('Upload in progress'); 
    // Post it
    $.ajax({
        url: appstate.posturl+"?q=savedatastring&uuid="+device.uuid, 
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

// Post images to server
function postimages(){
    // Check if there is an image that needs uploading
    if(currentImage==="" || appstate.imagecount==appstate.imagesuploaded || appstate.imageuploading===true){
        return;
    }
    // Ok, so there's an image that needs uploading  
    appstate.imagemsg = "UL";
    appstate.imageuploading=true;
    var imgStr = currentImage;
    // Now post it
    $.ajax({
        url: appstate.posturl+"?q=saveB64imagestr&uuid="+device.uuid, 
        type:"post",
        data: { 
            tracktitle: currentdata.track.title,
            imgtitle: appstate.imagecount+".jpg",
            imgstr:imgStr
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){ 
            appstate.imageuploading=false;
            alert(appstate.imagecount+"|"+appstate.imageuploading+"|"+errorThrown);
            appstate.imagemsg = "Error";
            appstate.imagerrors++;
        },
        success: function(data){
            appstate.imageuploading=false;
            appstate.imagesuploaded++;
            appstate.imagemsg = "s";
            alert(data);
        }
    }); 
}

// Print an alert to the screen
function alertme(msg, title){
    popup(msg, title);
}

// MANAGEING MEDIA 
function takePhoto() {
    navigator.camera.getPicture(
        // Successfully grabbed an image
        function photoSuccess(imageString) {
            if (imageString && imageString.length > 100) {
                var imagefileStr = "data:image/jpeg;base64," + imageString;
                ui.takepicbut.backgroundImage( imagefileStr );
                // Write the base 64 data to file
                appstate.lastimage = appstate.imagecount+".b64";
                setupFilesystem();
                currentImage = imagefileStr;
                writeFileToSDCard(imagefileStr, appstate.basedir+"/"+device.uuid+"/"+currentdata.track.title+"/"+appstate.lastimage);
                appstate.imagecount++;
            }
        },
        // Image has been grabbed
        function photoFail(message) {
            console.log("Image fail: " +message);
        }, 
        // Image parameters
        { 
            quality: 15, 
            destinationType : 0 
            
        }
    );   
}

// FILE MANAGEMENT OPTIONS
// Setup filesystem
function setupFilesystem(){
    // Setup location to store local file data
    createDirectory(appstate.rootdir);
    createDirectory(appstate.basedir);
    createDirectory(appstate.basedir+"/"+device.uuid);
    createDirectory(appstate.basedir+"/"+device.uuid+"/"+currentdata.track.title);
}
// Write content to file
function writeFileToSDCard(content, path) {
    if(appstate.writetofile!==true) return;
    var writer = new FileWriter(path);
    writer.write(content, false);              
}
// Create a new directory
function createDirectory(path) {
    if(appstate.writetofile!==true) return;
    var thisPath = path;
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
        function onRequestFileSystemSuccess(fileSystem) {  
            var entry=fileSystem.root; 
            // This command is causeing ios to crash:
            entry.getDirectory(thisPath, {create: true, exclusive: false}, 
                function onGetDirectorySuccess(dir) { 
                    console.log("Created dir "+dir.name); 
                }, 
                function onGetDirectoryFail(error) {  
                    console.log("Error creating directory "+error.code); 
                } 
            ); 
        }, 
        null
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
        ui.tag.text(currentdata.track.tag);
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
    ui.tag.text(""); 
    ui.tag.placeholder("Track Description"); 
    setupstorage();
    prepdataformat();
    setscreenoutput();
    alertme("Created new track", "Data");
    navigate.to('home');
}






