package uk.org.opensystem.plugin;

import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
// import org.json.JSONObject;

import android.util.Log;
import android.content.Intent;
import android.content.Context;
import android.content.IntentFilter;
import android.content.BroadcastReceiver;
import uk.org.opensystem.HelloIOIOService;
import android.support.v4.content.LocalBroadcastManager;

/**
 * This class manages a connection with the ioio board
 */
public class IOIOconnect extends CordovaPlugin {
	private Context thisContext;
	private Intent ioioService;
  
    
    // Handle calls from Javascript
    //@SuppressLint("NewApi")
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        // Call from javascript to startup the IOIO service
        if (action.equals("ioioStartup")) {
            this.ioioStartup(callbackContext); 
            return true;
        }
        // Call from javascript to stop the IOIO service
        if (action.equals("ioioStop")) {
            this.ioioStartup(callbackContext); 
            return true;
        }
        // Call from javascript to grab current variables
        if (action.equals("ioioIsAlive")) {
            this.ioioIsAlive(args.getString(0), callbackContext); 
            return true;
        }
        return false;
    }

    
    // Initialise IOIO service (Called from Javascript)
    private void ioioStartup(CallbackContext callbackContext) {
    	// Initialise the service variables and start it it up
    	thisContext = this.cordova.getActivity().getApplicationContext();
    	ioioService = new Intent(thisContext, HelloIOIOService.class);
        ioioService.putExtra("loadinterval", 800); // Set LED flash interval
        thisContext.startService(ioioService);
        
        // Setup a method to receive messages broadcast from the IOIO
        LocalBroadcastManager.getInstance(thisContext).registerReceiver(
                mMessageReceiver, 
                new IntentFilter("speedExceeded")
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
    private void ioioIsAlive(String msg, CallbackContext callbackContext) {
        //String message = "Led: "+ioioObj.onoff+" Status: "+ioioObj.status;
    	//sendBroadcast(Intent intent);
    	
        String message = "Alive";
        ioioSwitchOnoff();
        if (message != null && message.length() > 0) { 
            callbackContext.success(message);
        } else {
            callbackContext.error("IOIO.java Expected one non-empty string argument.");
        }
    }
    

    // Switch
    private void ioioSwitchOnoff() {
        /*
        if(ioioObj.onoff == false){
            ioioObj.onoff = true;
        }else{
            ioioObj.onoff = false;
        }
        */
    }

    // Receive massage from the IOIO device
    private BroadcastReceiver mMessageReceiver = new BroadcastReceiver() {
    	@Override
    	public void onReceive(Context context, Intent intent) {
    		int interval = intent.getIntExtra("interval", 0);
    		//  React to local broadcast message
    		//Log.d("southendtransport.java", "IOIO plugin got message: "+interval);
    	}
    };

}