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
    public IOIOmanager ioioObj = new IOIOmanager(false);
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
        String message = "Led: "+ioioObj.onoff+" Status: "+ioioObj.status;
        ioioSwitchOnoff();
        if (message != null && message.length() > 0) { 
            callbackContext.success(message);
        } else {
            callbackContext.error("IOIO.java Expected one non-empty string argument.");
        }
    }

    // Switch
    private void ioioSwitchOnoff() {
        if(ioioObj.onoff == false){
            ioioObj.onoff = true;
        }else{
            ioioObj.onoff = false;
        }
    }

    // Initialise IOIO
    private void ioioStartup(CallbackContext callbackContext) {
        String message = "onoff: "+ioioObj.onoff+" Status: "+ioioObj.status;
        callbackContext.success(message);
    }


    /* ======================================================
     * CLASS TO MANAGE CONNECTIONS TO AND FROM AN IOIO DEVICE
     * ======================================================
     */
    public class IOIOmanager extends IOIOActivity {
        
        // Public vars
        public boolean onoff;
        public String status = "s ";

        //constructor
        public IOIOmanager(boolean onoff) {
            onoff = true;
            status += "b ";
        }

        class Looper extends BaseIOIOLooper {
            /** The on-board LED. */
            private DigitalOutput led_;

            /* Called every time a connection with IOIO has been established.
             * Typically used to open pins.
             * @throws ConnectionLostException
             * When IOIO connection is lost.
             * @see ioio.lib.util.AbstractIOIOActivity.IOIOThread#setup()
             */
            @Override
            protected void setup() throws ConnectionLostException {
                status += "c ";
                led_ = ioio_.openDigitalOutput(0, onoff);
            }

            // Called repetitively while the IOIO is connected.
            @Override
            public void loop() throws ConnectionLostException {
                led_.write(false);
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                }
            }
        }

        // A method to create the IOIO thread.
        @Override
        protected IOIOLooper createIOIOLooper() {
            status += "cl ";
            return new Looper();
        }

    }


    // ======================================

    public class MainActivity extends IOIOActivity {
        public boolean onoff = true;
        public String status = "ss ";
        //private ToggleButton button_;

        /**
         * Called when the activity is first created. Here we normally initialize
         * our GUI.
         */
        @Override
        public void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
            //setContentView(R.layout.main);
            //button_ = (ToggleButton) findViewById(R.id.button);
        }

        /**
         * This is the thread on which all the IOIO activity happens. It will be run
         * every time the application is resumed and aborted when it is paused. The
         * method setup() will be called right after a connection with the IOIO has
         * been established (which might happen several times!). Then, loop() will
         * be called repetitively until the IOIO gets disconnected.
         */
        class Looper extends BaseIOIOLooper {
            /** The on-board LED. */
            private DigitalOutput led_;

            /**
             * Called every time a connection with IOIO has been established.
             * Typically used to open pins.
             * 
             * @throws ConnectionLostException
             *             When IOIO connection is lost.
             * 
             * @see ioio.lib.util.AbstractIOIOActivity.IOIOThread#setup()
             */
            @Override
            protected void setup() throws ConnectionLostException {
                led_ = ioio_.openDigitalOutput(0, true);
            }

            /**
             * Called repetitively while the IOIO is connected.
             * 
             * @throws ConnectionLostException
             *             When IOIO connection is lost.
             * 
             * @see ioio.lib.util.AbstractIOIOActivity.IOIOThread#loop()
             */
            @Override
            public void loop() throws ConnectionLostException {
                led_.write(false);
                //led_.write(!button_.isChecked());
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                }
            }
        }

        /**
         * A method to create our IOIO thread.
         * 
         * @see ioio.lib.util.AbstractIOIOActivity#createIOIOThread()
         */
        @Override
        protected IOIOLooper createIOIOLooper() {
            return new Looper();
        }
    }


    // ========================================
}


