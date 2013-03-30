package uk.org.opensystem.plugin;
import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.apache.cordova.api.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

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


/**
 * This class manages a connection with the ioio board
 */
public class IOIOconnect extends CordovaPlugin {
//public class IOIOconnect extends CordovaPlugin {

    // An IOIO object used to manage IOIO communications
    //public IOIOmanager ioioObj = new IOIOmanager(false);
    //public MainActivity ioioObj = new MainActivity();

    //public Intent intent = new Intent(this, MainActivity.class);
    //public MyActivity myAct = (MyActivity)this.cordova.getActivity();
    //public Context context = this.cordova.getActivity().getApplicationContext();
    //public IOIOmanager ioioObj = new IOIOmanager();
    //this.cordova.getActivity().startActivity() 
    //context.startActivity(IOIOmanager);

    /* =======================================================
     * HANDLE JAVASCRIPT CALLS
     * =======================================================
     */
    //@SuppressLint("NewApi")
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        // Call from javascript to initialise
        if (action.equals("ioioStartup")) {
            this.ioioStartup(callbackContext); 
            //cordova.getActivity().runOnUiThread(new Runnable() { 
            //    public void run() {                    
            //        activity = cordova.getActivity();
            //    }
            //}
            return true;
        }
        // Call form javascript to grab current variables
        if (action.equals("ioioIsAlive")) {
            this.ioioIsAlive(args.getString(0), callbackContext); 
            return true;
        }
        return false;
    }

    // Echo strings back to javascript
    private void ioioIsAlive(String msg, CallbackContext callbackContext) {
        //String message = "Led: "+ioioObj.onoff+" Status: "+ioioObj.status;
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

    // Initialise IOIO
    private void ioioStartup(CallbackContext callbackContext) {
        //String message = "onoff: "+ioioObj.onoff+" Status: "+ioioObj.status;
        String message = "Startup";
        callbackContext.success(message);
    }
    
}