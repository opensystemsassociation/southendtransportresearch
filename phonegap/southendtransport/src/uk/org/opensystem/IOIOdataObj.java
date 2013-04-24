package uk.org.opensystem;

// An object to store IOIO vars in
public class IOIOdataObj {
	
	// Light sensor
	public float a44 = (float) 0.0; 
	public int a44event = 0;
	public int a44eventStored = 0;
	
	// Location to store pin values 
	// GSR sensor
	public float a43 = (float) 0.0; 
	public int a43event = 0;
	public int a43eventStored = 0;
	
	// Has JS triggered an event?
	public int jseventStored;
	public int jsevent;
	
	// Reset all saved events (used by service)
	public void resetEvents(){
		a44event = 0;
		a43event = 0;
		jsevent = 0;
	}
	
	// Reset all stored events (used by plugin)
	public void resetStoredEvents(){
		a44eventStored = 0;
		a43eventStored = 0;
		jseventStored = 0;
	}
	
	// Reset all stored events (used by plugin)
	public void allEventsOn(){
		a44event = 0;
		a43event = 0;
		jsevent = 0;
	}
	
	// Return a JSON string of this objects variables
	public String getjson(){
		String json = "{"+
			        "\"a44\":"+a44+","+
			    	"\"a44Event\":"+a44eventStored+","+
			    	"\"a43\":"+a43+","+
			    	"\"a43Event\":"+a43eventStored+
			    	"}";
		return json;
	}
}