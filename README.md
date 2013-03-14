southendtransport
=================     
A collection of scripts designed to collect transport data.
=================     

DATA STRUCTURE

    {
    	"track" : {
            "title": "A track name",
            "author": "Your Name", 
            "start-time": "000",
            "end-time": "000",
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
                  "image-file" 		: ["name2.jpg",0,0,"name2.jpg"],
                  "accelerometer" 	: [ [x,y,z], [x,y,z], 0, [x-y-z] ],
                  "shakeevent-yn" 	: [0,1,0,0]
            }
		}
    }
  
