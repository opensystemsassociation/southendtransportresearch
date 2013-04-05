package uk.org.opensystem.plugin;

import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.apache.cordova.api.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import uk.org.opensystem.HelloIOIOService;


import ioio.lib.api.AnalogInput;
import ioio.lib.api.DigitalOutput;
import ioio.lib.api.IOIO;
import ioio.lib.api.PwmOutput;
import ioio.lib.api.exception.ConnectionLostException;
import ioio.lib.util.BaseIOIOLooper;
import ioio.lib.util.IOIOLooper;
import ioio.lib.util.android.IOIOActivity;

import android.os.Bundle;
import android.view.View;
import android.util.Log;
import android.app.Activity;
import android.content.Intent;
import android.content.Context;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.app.Service;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.Binder;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;
import android.widget.Toast;
import android.os.Handler;
import android.os.Message;
import android.os.Messenger;
import android.os.RemoteException;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.BroadcastReceiver;
import android.support.v4.content.LocalBroadcastManager;

/**
 * This class manages a connection with the ioio board
 */
public class IOIOconnect extends CordovaPlugin {
	private Context thiscontext;
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
    	thiscontext = this.cordova.getActivity().getApplicationContext();
    	ioioService = new Intent(thiscontext, HelloIOIOService.class);
        ioioService.putExtra("loadinterval", 800); // Set LED flash interval
        thiscontext.startService(ioioService);
        
        // Setup a method to receive messages broadcast from the IOIO
        LocalBroadcastManager.getInstance(thiscontext).registerReceiver(
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
        thiscontext.stopService(ioioService);
        Log.d("helloIOIOService.java", "IOIO Stopped from the plugin"); 
        // Send a message back to the Javascript call
        callbackContext.success("Stopped IOIO service");
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

    // recieve massage from the IOIO device
    private BroadcastReceiver mMessageReceiver = new BroadcastReceiver() {
    	@Override
    	public void onReceive(Context context, Intent intent) {
    		String action = intent.getAction();
    		Double currentSpeed = intent.getDoubleExtra("currentSpeed", 20);
    		Double currentLatitude = intent.getDoubleExtra("latitude", 0);
    		Double currentLongitude = intent.getDoubleExtra("longitude", 0);
    		//  React to local broadcast message
    		Log.d("southendtransport.java", "IOIO plugin got nmessage");
    	}
    };

}