// The following has/will be written so as to be as portable/appfurnce independent as possible
var sub = 0;
var onoff = 0;
var fails = 0;
var lat = 0;
var lng = 0;
var starttime = grabtime();
var elapsed = 0;

function starttracking() {
    ui.uuid.text("uuid: "+device.uuid);
    if(onoff===0){
        ui.but.text("Tracking...");
        af.locationSensor.start();
    }
    // Setup an interval to grab data    
    pollsensors();
    window.setInterval(pollsensors, 5000);
}

// Save current sensor output
function pollsensors() {
    // Set relevent sensor info
    grabgps();
    elapsed = grabelapsed();
    // Set screen output
    ui.lat.text('lat: '+lat);
    ui.lng.text('lng: '+lng);
    ui.elapsed.text('Elapsed Mins: '+( (elapsed/1000)/60)  );
    // Post data
    var mydata = prepdataformat();
    postdata(mydata);
}

// Grab GPS data: TODO: Check gps is on, if not then alert
function grabgps() {
    //af.locationSensor.setMoved( function(loc) {
        var latlng = af.locationSensor.getLastLocation();
        lat = latlng.y;
        lng = latlng.x;
    //});
}

// Calculate elapsed time
function grabelapsed() {
    var currentime = grabtime();
    return currentime-starttime;
}

// Grab the current date
function grabdate(){
    var myDate = new Date();
    return (myDate.getMonth()+1) + '/' + (myDate.getDate()) + '/' + myDate.getFullYear();
}

// Grab the number of milliseconds since midnight Jan 1, 1970
function grabtime(){
    var myTime = new Date();
    return myTime.getTime();
}
      
// Data format
function savedatatofile(){
   // [elapsed, [lat, lng], imageFile, [x,y,z], shakeEvent]     
}

// Data format
function prepdataformat(){    
   var vars = {
        "track" : { 
            "title": "A track name", 
            "author": "Your Name", 
            "start-time": "000", 
            "end-time": "000", 
            "device-name": device.name,   
            "device-cordova": device.cordova,
            "device-platform": device.platform,
            "device-version": device.version,
            "device-uuid": device.uuid
        },
        "points" : {
              "elapsed"         : [ [1],[6],[11],[16] ],
              "gps"             : [ [51.44911,-0.10858],[51.44911,-0.10858],[51.44911,-0.10858],[51.44911,-0.10858] ],
              "image-file"      : ["name2.jpg",0,0,"name2.jpg"],
              "accelerometer"   : [ [11.4,44.6,55.2], [77.3,66.4,55.5], 0, [250.7,34.8,66.9] ],
              "shakeevent-yn"   : [0,1,0,0]
        }
   };
   return vars;
}

// Post data to server
function postdata(mydata){
  $.ajax({
    headers: {'Content-Type': 'application/json'},
    url: "http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/index.php?q=savedata&uuid="+device.uuid , 
    dataType: 'json',
    data : JSON.stringify(mydata),
    contentType : 'application/json',
    type : 'POST',
     error: function(XMLHttpRequest, textStatus, errorThrown){ 
        fails++;
        ui.failed.text('Fails: '+fails);
        //popup("Error", 'status:' + XMLHttpRequest.status + ', status text: ' + XMLHttpRequest.statusText);
     },
     success: function(data){
        sub++;
        ui.sub.text('Submit: '+sub+" msg: "+data);
     }
  });
}
 
// Post data to server
function postCoords(lat,lng){
  var thisdata = "&la="+lat+"&lo="+lng+"&uuid="+device.uuid ;
  $.ajax({
     url: "http://transport.yoha.co.uk/sites/transport.yoha.co.uk/leaflet-multi-map/index.php?q=savedata"+thisdata, 
     dataType: 'json',
     headers: {'Content-Type': 'application/json'},
     data: { la: lat, lo:lng, uuid:device.uuid },
     type: 'POST',
     error: function(XMLHttpRequest, textStatus, errorThrown){ 
        fails++;
        ui.failed.text('Failed: '+fails);
        //popup("Error", 'status:' + XMLHttpRequest.status + ', status text: ' + XMLHttpRequest.statusText);
     },
     success: function(data){
        ui.sub.text('Submit: '+sub+" msg: "+data);
     }
  });
}

