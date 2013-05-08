package uk.org.opensystem;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.os.Binder;
import android.os.IBinder;
import android.support.v4.content.LocalBroadcastManager;
import android.util.Log;
import ioio.lib.api.DigitalOutput;
import ioio.lib.api.IOIO;
import ioio.lib.api.exception.ConnectionLostException;
import ioio.lib.util.BaseIOIOLooper;
import ioio.lib.util.IOIOLooper;
import ioio.lib.util.android.IOIOService;
import ioio.lib.api.AnalogInput;
//import ioio.lib.api.DigitalOutput;
import ioio.lib.api.PwmOutput;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import uk.org.opensystem.R;
import uk.org.opensystem.R.drawable;
import uk.org.opensystem.IOIOdataObj;
import org.apache.cordova.*;
import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;


/**
 * An example IOIO service. While this service is alive, it will attempt to
 * connect to a IOIO and blink the LED. A notification will appear on the
 * notification bar, enabling the user to stop the service.
 * For external communications try: https://github.com/nickfox/Update-Android-UI-from-a-Service
 */
public class HelloIOIOService extends IOIOService {
	private static String TAG = "helloIOIOService.java";
	private int ledinterval = 10;
	private int threadInterval = 10;
	private double gsrThresh = 0.02;
	private double ldrThresh = 0.05;
	private boolean onoff  = false;
	private boolean autotriggers  = true;
	private int counter = 0;
	private Intent broadcastIntent = new Intent("returnIOIOdata");
	private IOIOdataObj IOIOdata = new IOIOdataObj();
	
    // USUAL IOIO SERVICE STUFF
	@Override
	public void onStart(Intent intent, int startId) {  
		
		// Service has been started
		super.onStart(intent, startId);
		
        // IOIO When service is started load external vars (if set)
		int loadinterval = intent.getIntExtra("loadinterval", -1);
		
		if(loadinterval>=0){ threadInterval = loadinterval; }
		Log.d(TAG, "IOIO started service. ThreadInt:"+threadInterval);
	    
        // Setup a method to receive messages broadcast from the IOIO plugin
        LocalBroadcastManager.getInstance(this).registerReceiver(
        		mIOIOReceiver, 
                new IntentFilter("msgIOIO")
        );    
        
		// Create a an item in androids 'service' dropdown (where wifi/bt is etc)
		NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
		if (intent != null && intent.getAction() != null && intent.getAction().equals("stop")) {
			// User clicked the notification. Need to stop the service.
			nm.cancel(0);
			stopSelf();
		} else {
			// Service starting. Create a notification.
			Notification notification = new Notification(
					R.drawable.ic_launcher, "IOIO service running",
					System.currentTimeMillis());
			notification
					.setLatestEventInfo(this, "IOIO Service", "Click to stop",
							PendingIntent.getService(this, 0, new Intent(
									"stop", null, this, this.getClass()), 0));
			notification.flags |= Notification.FLAG_ONGOING_EVENT;
			nm.notify(0, notification);
		}
		
	}

    // IOIO Thread
	@Override
	protected IOIOLooper createIOIOLooper() {
		return new BaseIOIOLooper() {
			private DigitalOutput led_;
			private AnalogInput a44_;
			private AnalogInput a43_;
			private PwmOutput a46_;
			private PwmOutput a38_;
			private PwmOutput a37_;
			private tuneManager lightTuneObj_ = new tuneManager();
			private tuneManager jsTuneObj_ = new tuneManager();
			private tuneManager gsrTuneObj_ = new tuneManager();
			private eventChecker gsrEventObj = new eventChecker();
			private eventChecker lightEventObj = new eventChecker();
			private smoothVar lightSmoothObj = new smoothVar(10);
			private smoothVar gsrSmoothObj = new smoothVar(5);
			
			// Setup inputs & outputs
			@Override
			protected void setup() throws ConnectionLostException,
				InterruptedException {
					led_ = ioio_.openDigitalOutput(IOIO.LED_PIN);
					// Setup analog inputs
					a44_ = ioio_.openAnalogInput(44);
					a43_ = ioio_.openAnalogInput(43);
					// Setup analog outputs
					a46_ = ioio_.openPwmOutput(46, 100);
					a38_ = ioio_.openPwmOutput(38, 500);
					a37_ = ioio_.openPwmOutput(37, 100);
				}
			
			// Read and write inputs and outputs
			@Override
			public void loop() throws ConnectionLostException, InterruptedException {
				
				// Light sensor: Check if there has been a rapid change of event
				IOIOdata.a44 = a44_.read();
				IOIOdata.a44event = lightEventObj.checkEvent("LIGHT", IOIOdata.a44, ldrThresh);
				if(IOIOdata.a44event==1) lightTuneObj_.playTune(750);
				a46_.setDutyCycle( lightTuneObj_.checkMe() );
				
				// GSR Sensor: Read input and set PWM out
				IOIOdata.a43 = gsrSmoothObj.readSmooth( a43_.read() );
				IOIOdata.a43event = gsrEventObj.checkEvent("GSR", IOIOdata.a43, gsrThresh);
				if(IOIOdata.a43event==1) gsrTuneObj_.playTune(750);
				a38_.setDutyCycle( gsrTuneObj_.checkMe() );
				
				// Js: Trigger output if JS tells us
				if(IOIOdata.jsevent==1) jsTuneObj_.playTune(500);
				a37_.setDutyCycle( jsTuneObj_.checkMe() );
				
				// Send all recorded Vars to IOIO plugin
				broadcastVars();
				
				// Reset all event vars
				IOIOdata.resetEvents();
				
				//Log.d("helloIOIOService.java", "IOIO "+ "a44:"+IOIOdata.a44+" "+"a45:"+IOIOdata.a45); 
				
				// Async script to flash on-board LED
				counter = counter+threadInterval;
				if(counter>=(250) ){
					onoff = !onoff;
					led_.write(onoff);
					counter=0;
				}	
				Thread.sleep(threadInterval);
				
			}
			
		};
	}

	// Check if a variable has 'significantly' jumped specified by range
	private class eventChecker {
		private double lastVal = -1.0f; // Store the last available value
		private int event = 0;
		private int checkEvent(String ref, double val, double range){
			if(autotriggers!=true) return 0;
			double plus = val-lastVal;
			double minus = lastVal-val;
			if(plus>=range || minus>=range){
				//Log.d(TAG, "IOIO "+ref+" p:"+plus+" v:"+val );
				event = 1;
			}else{
				event = 0;
			}
			lastVal = val;
			return event; 
		}
	}

	// Remove noise from a variable list
	private class smoothVar {
		int numReadings = 10;
		float[] readings;
		int index = 0;                  // The index of the current reading
		float total = 0;                  // The running total
		float average = 0;                // The average
		
		// initialise all the readings to 0.0
		public smoothVar(int readingsCnt){
		  numReadings = readingsCnt;
		  readings = new float[numReadings];  // an array to store readings
		  for (int thisReading = 0; thisReading < numReadings; thisReading++){ 
		    readings[thisReading] = 0.0f;  
		  }
		}
		
		// read the smoothed variable
		private float readSmooth(float newval){
		  total = total-readings[index];   // Subtract the last reading  
		  readings[index] = newval; 			  // Read from the sensor
		  total = total + readings[index];         // Add the reading to the total    
		  index = index + 1;                      // Advance to the next position in the array:                 
		  if (index >= numReadings)               // If we're at the end of the array...          
		    index = 0;                            // Wrap around to the beginning                   
		  average = total / numReadings;          // Calculate the average
		  return  average;
		}
	}
	
	// A class to manage random generation of a float over time
	private class tuneManager {
		// Setup vars
		private int setpwm = 0;
		private int interval = 250;
		private float rand = 0.0f;
		private int timer = 2000; 	
		// Calculate random note & interval
		private float checkMe() {
			timer=timer-threadInterval;
			if(timer>=0){	
				setpwm=setpwm+threadInterval;	
				if(setpwm>=interval){
					rand = (float) Math.random();		
					setpwm = 0;
					float rand2 = (float) Math.random();;
				}
			}else{
				rand = 0.0f;
				timer = 0;
			}
			return rand;			
		}
		// Reset the timer so a a tune is played
		private void playTune(int newTimeout) {
			timer = newTimeout;
		}
	}

    // Broadcast a message to the IOIO plugin
    private void broadcastVars(){
    	
    	// Which vars to send  
    	broadcastIntent.putExtra("a44", IOIOdata.a44); 
    	broadcastIntent.putExtra("a44event", IOIOdata.a44event);
    	broadcastIntent.putExtra("a43", IOIOdata.a43);  
    	broadcastIntent.putExtra("a43event", IOIOdata.a43event); 
    	
    	// Send the intent
        LocalBroadcastManager.getInstance(this).sendBroadcast(broadcastIntent);
        // Log.d("helloIOIOService.java", "IOIO sending message");
    }	
    
    // Receive message from the phonegap plugin
    private BroadcastReceiver mIOIOReceiver = new BroadcastReceiver() {
    	@Override
    	public void onReceive(Context context, Intent intent) {
    		// Received a message
    		String msg = intent.getStringExtra("msg");
    		if(msg.equals("stopautotriggers")) autotriggers  = false;
    		if(msg.equals("startautotriggers")) autotriggers  = true;
    		if(msg.equals("a46_playpwm")) IOIOdata.a44event = 1;
    		if(msg.equals("a38_playpwm")) IOIOdata.a43event = 1;
    		if(msg.equals("a37_playpwm")){
    			IOIOdata.jsevent = 1;
    		}
    		Log.d(TAG, "IOIO recieved message:"+msg);
    	}
    };
    
    // This service is not bound to an activity
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    
}
