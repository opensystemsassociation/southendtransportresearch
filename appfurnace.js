// The following has/will be written so as to be as portable/appfurnace independent as possible
var cpos = 0;
var sub = 0;
var fails = 0;
var lat = 0;
var lng = 0;
var accell = [0,0,0];
var imagefile = 0;
var starttime = grabtime();
var elapsed = 0;
var shakeevent = 0;
var posturl = "http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/index.php";   
var currentdata = prepdataformat();

// INITIALISATION
// Start tracking when the user click the button
function starttracking() {
    // Switch the display and start the location sensor
    ui.uuid.text("uuid: "+device.uuid);
    ui.but.text("Tracking...");
    af.locationSensor.start();
    
    // Setup an interval to grab data    
    pollsensors();
    window.setInterval(pollsensors, 5000);
    
    // Setup an interval to send the current possition to the server.
    sendcurrentpos();
    window.setInterval(sendcurrentpos, 10000);
}

// Prep data format
function prepdataformat(){  
   var currentTime = grabtime();
   var vars = {
        "track" : { 
            "title": grabdatetime(), 
            "author": "Your Name", 
            "starttime": currentTime, 
            "endtime": currentTime, 
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
   
   
   return vars;
}

// MANAGING SENSORS
// Save current sensor output
function pollsensors() {
    // Set relevent sensor info
    grabgps();
    elapsed = grabelapsed();
    // Save data
    currentdata.track.points.elapsed.push (elapsed);
    currentdata.track.points.gps.push([lat,lng]);
    currentdata.track.points.accelerometer.push(accell); 
    currentdata.track.points.imagefile.push(imagefile);
    currentdata.track.points.shakeevent.push(shakeevent);
    // Set screen output
    ui.trackname.text('Track title: '+currentdata.track.title);
    ui.points.text('Data Points: '+currentdata.track.points.elapsed.length);
    ui.cpos.text('Sent current position: '+cpos);
    ui.lat.text('lat: '+lat);
    ui.lng.text('lng: '+lng);
    ui.elapsed.text('Elapsed Secs: '+Math.round(elapsed/1000)  );
    // Reset relevent vars
    imagefile = 0;
    shakeevent = 0;
    // Write data to file
    //writetofile();
}

// Grab GPS data: TODO: 1. Check gps is on, if not then alert 2. Make Appfurnace Independent 3. Smooth data
function grabgps() {
    //af.locationSensor.setMoved( function(loc) {
        var latlng = af.locationSensor.getLastLocation();
        lat = latlng.y;
        lng = latlng.x;
    //});
}

// Grab accelleromter data: TODO: write it
function grabaccellerometer(){
   accell = [1,2,3]; 
}

// Grab accelleromter data: TODO: write it
function grabimagefile(){
   imagefile = 0; 
}

// Calculate elapsed time
function grabelapsed() {
    var currentime = grabtime();
    return currentime-starttime;
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
        url: posturl+"?q=savedata&uuid="+device.uuid, 
        type:"post",
        data: { 
            vars:JSON.stringify(currentdata)
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){ 
            fails++;
            var msg = ' e:'+XMLHttpRequest.statusText+" s:"+textStatus+" et:"+errorThrown;
            ui.failed.text('Fails:'+fails+msg);
            ui.uploadbut.text('Upload Data'); 
        },
        success: function(data){
            sub++;
            ui.sub.text('Uploaded:'+sub+" msg: "+data); 
            ui.uploadbut.text('Upload Data');
            ui.failed.text('Fails:'+fails);
        }
    }); 
}
 
// Send current position to the server: 
function sendcurrentpos(){
    $.ajax({
        url: posturl+"?q=savelivedevice&uuid="+device.uuid+"&la="+lat+"&lo="+lng+'&dn='+currentdata.track.device.name,
        error: function(XMLHttpRequest, textStatus, errorThrown){ 
            ui.cpos.text('Current position: failed to send');  
        },
        success: function(data){
            cpos++;          
        }
    }); 
}

// Print an alert to the screen
function alertme(msg, title){
    popup(msg, title);
}




