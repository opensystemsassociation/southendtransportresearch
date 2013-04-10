package uk.org.opensystem;

// An object to store IOIO vars in
public class IOIOdataObj {
	
	// Location to store pin values 
	// GSR sensor
	public float a44 = (float) 0.0; 
	public int a44event = 0;
	public int a44eventStored = 0;
	
	// Light sensor
	public float a45 = (float) 0.0; 
	public int a45event = 0;
	public int a45eventStored = 0;
	
	// Reset all saved events (used by service)
	public void resetEvents(){
		a44event = 0;
		a45event = 0;
	}
	
	// Reset all stored events (used by plugin)
	public void resetStoredEvents(){
		a44eventStored = 0;
		a45eventStored = 0;
	}
	
	// Return a JSON string of this objects variables
	public String getjson(){
		String json = "{"+
			        "\"a44\":"+a44+","+
			    	"\"a44Event\":"+a44eventStored+","+
			    	"\"a45\":"+a45+","+
			    	"\"a45Event\":"+a45eventStored+
			    	"}";
		return json;
	}
}