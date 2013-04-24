package uk.org.opensystem.plugin;

import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

import uk.org.opensystem.HelloIOIOService;
import uk.org.opensystem.IOIOdataObj;
// import org.json.JSONObject;

import android.util.Log;
import android.content.Intent;
import android.content.Context;
import android.content.IntentFilter;
import android.content.BroadcastReceiver;
import android.support.v4.content.LocalBroadcastManager;

/**
 * This class manages a connection with the ioio board
 */
public class IOIOconnect extends CordovaPlugin {
	private Context thisContext;
	private Intent ioioService;
	private IOIOdataObj IOIOdata = new IOIOdataObj();
	private Intent broadcastIntent = new Intent("msgIOIO");
    
    // Handle calls from Javascript
    //@SuppressLint("NewApi")
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        
    	// Call from javascript to startup the IOIO service
        if (action.equals("ioioStartup")) {
            this.ioioStartup(callbackContext); 
            return true;
        }
        // Call from javascript to grab current variables
        if (action.equals("ioioGrabData")) {
            this.ioioGrabData(args.getString(0), callbackContext); 
            return true;
        }
        // Tell the IOIO to trigger an event
        if (action.equals("ioioSendMessage")) {
            this.ioioSendMessage(args.getString(0), callbackContext); 
            return true;
        }        
        
        return false;
    }
    
    // Initialise IOIO service (Called from Javascript)
    private void ioioStartup(CallbackContext callbackContext) {
    	// Initialise the service variables and start it it up
    	thisContext = this.cordova.getActivity().getApplicationContext();
    	ioioService = new Intent(thisContext, HelloIOIOService.class);
        ioioService.putExtra("loadinterval", 300); // Set thread interval
        thisContext.startService(ioioService);
        IOIOdata.allEventsOn();
        
        // Setup a method to receive messages broadcast from the IOIO
        LocalBroadcastManager.getInstance(thisContext).registerReceiver(
                mMessageReceiver, 
                new IntentFilter("returnIOIOdata")
        );     
        
        // Send a message back to the Javascript call
        Log.d("helloIOIOService.java", "IOIO Started from the plugin"); 
        callbackContext.success("Started IOIO service");
    }

    // Stop IOIO service (Called from Javascript)
    private void ioioStop(CallbackContext callbackContext) {
    	// Grab context and start the service
    	thisContext.stopService(ioioService);
        // Send a message back to the Javascript call
        callbackContext.success("Stopped IOIO service");
        Log.d("helloIOIOService.java", "IOIO Stopped from the plugin"); 
    }
    
    // Echo strings back to javascript
    private void ioioGrabData(String msg, CallbackContext callbackContext) {

    	// Grab a JSON string ready to send to the .js callback
        String message = IOIOdata.getjson();
        
        // Reset all stored events
        IOIOdata.resetStoredEvents();
        
        // Send message back to javascript
        if (message != null && message.length() > 0) { 
            callbackContext.success(message);
        } else {
            callbackContext.error("IOIO.java Expected one non-empty string argument.");
        }
        
    }
    
    // Send a message to IOIO service
    private void ioioSendMessage(String msg, CallbackContext callbackContext){
    	// Which vars to send  
    	broadcastIntent.putExtra("msg", msg);
    	// Send the message to the IOIO
        LocalBroadcastManager.getInstance(thisContext).sendBroadcast(broadcastIntent);
    	//Log.d("helloIOIOService.java", "IOIO sent a message"); 
    }
    
    // Receive message from the IOIO device
    private BroadcastReceiver mMessageReceiver = new BroadcastReceiver() {
    	@Override
    	public void onReceive(Context context, Intent intent) {
    		// Light sensor
    		IOIOdata.a44 = intent.getFloatExtra("a44", (float) 0.0);
    		IOIOdata.a44event = intent.getIntExtra("a44event", 0);
    		if(IOIOdata.a44eventStored==0 && IOIOdata.a44event==1){
    			IOIOdata.a44eventStored = 1;
    		}
    		// GSR sensor
    		IOIOdata.a43 = intent.getFloatExtra("a43", (float) 0.0);
    		IOIOdata.a43event = intent.getIntExtra("a43event", 0);
    		if(IOIOdata.a43eventStored==0 && IOIOdata.a43event==1){
    			IOIOdata.a43eventStored = 1;
    		}
    	}
    };

}