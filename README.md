SOUTHEND TRANSPORT
==================     
A collection of scripts designed to collect transport data.
  

Data Structure  
--------------
    {
    	"track" : {
            "title": "A track name",
            "tag": "Describe this track"
            "author": "Your Name", 
            "starttime": "000",
            "endtime": "000",
            "device" : {
            	"name": "???",   
                "cordova": "???",
                "platform": "???",
                "version": "???",
                "uuid": "???"
            },
            "points" : {
                  "elapsed" 		: [ [1],[6],[11],[16] ],
                  "gps" 			: [ [lat,lng],[lat,lng],[lat,lng],[lat,lng] ],
                  "imagefile" 		: ["name2.jpg",0,0,"name2.jpg"],
                  "accelerometer" 	: [ [x,y,z], [x,y,z], 0, [x-y-z] ],
                  "shakeevent" 	: [0,1,0,0]
            }
	}
    }
Folder Structure
----------------
New tracks with associate files can be directly added to the folder structure.
When a new track is uploaded to the server the following folder structure is generated 
which the leaflet.js scripts generates visualisations from:

    tracks
    	device.uuid
    		yyyy-mm-dd_h-m-s
    			data.json
    			timestamp.jpg
    			timestamp2.jpg
    		2013-2-21_23-26-2
    		    	data.json
    			timestamp1.jpg
    			timestamp2.jpg
    			timestamp3.jpg
    		2013-2-21_23-26-5
    		    	data.json
    			timestamp1.jpg
    	device.uuid
    		2013-2-21_23-26-5
    			data.json
    		2013-2-21_23-26-34
    		        data.json
    			timestamp1.jpg
    

Integration of ioio board
-------------------------
Currently developing a phonagap plugin for the IOIO board. 

**The IOIO exmaples have been tested with**  
- Android phone: The Samsung Gallaxy GT-19000
- Android version: Android 2.3.6
- IOIO hardware: SPRK0020
- IOIO bootloader: IOIO0400
- IOIO Firmware: IOIO0330
- Connection: Socket(ADB)
  
With the configeration above, the IOIO hello world example worked with the IOIO 0330 libraries.

**Usefull links**  
IOIO downloads: https://github.com/ytai/ioio/wiki/Downloads  
IOIO Hardware tester: https://play.google.com/store/apps/details?id=ioio.example.ioiohardwaretester&hl=en  
Trouble shooting eclipse: https://github.com/ytai/ioio/wiki/Eclipse-Troubleshooting  
Local messaging in an android app: http://www.intertech.com/Blog/Post/Using-LocalBroadcastManager-in-Service-to-Activity-Communications.as



