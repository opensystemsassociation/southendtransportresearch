package uk.org.opensystem;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
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
import ioio.lib.api.DigitalOutput;
import ioio.lib.api.IOIO;
import ioio.lib.api.PwmOutput;

import android.content.Intent;
import org.json.JSONObject;
import uk.org.opensystem.R;
import uk.org.opensystem.R.drawable;

import org.apache.cordova.*;


/**
 * An example IOIO service. While this service is alive, it will attempt to
 * connect to a IOIO and blink the LED. A notification will appear on the
 * notification bar, enabling the user to stop the service.
 * For external communications try: https://github.com/nickfox/Update-Android-UI-from-a-Service
 */
public class HelloIOIOService extends IOIOService {
	private static String TAG = "helloIOIOService.java";
	private int ledinterval = 500;
	private int threadInterval = 1000;
	private boolean onoff  = false;
	private int counter = 0;
	private Intent broadcastIntent = new Intent("returnIOIOdata");
	private IOIOdataObj IOIOdata = new IOIOdataObj();
	
	// An object to store IOIO vars in
	private class IOIOdataObj {
		// Location to store pin values 
		float a45; 
		float a44; 
		int a45event = 0;
		private void resetEvents(){
			IOIOdata.a45event = 0;
		}
	}
	
    // USUAL IOIO SERVICE STUFF
	@Override
	public void onStart(Intent intent, int startId) {  
		
		// Service has been started
		super.onStart(intent, startId);
		
		// Send a message
		//broadcastVars();
		
        // IOIO When service is started load external vars (if set)
		int loadinterval = intent.getIntExtra("loadinterval", -1);
		if(loadinterval>=0){ threadInterval = loadinterval; }
		Log.d(TAG, "IOIO started service. ThreadInt:"+threadInterval);
	        
		// Native IOIO stuff
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
			private AnalogInput a45_;
			private AnalogInput a44_;
			private PwmOutput a46_;
			private tuneManager tuneObj_ = new tuneManager();
			private eventChecker lightEventObj = new eventChecker();
			private eventChecker gsrEventObj = new eventChecker();
			boolean lightEvent;
			
			// Setup inputs & outputs
			@Override
			protected void setup() throws ConnectionLostException,
				InterruptedException {
					led_ = ioio_.openDigitalOutput(IOIO.LED_PIN);
					// Setup analog inputs
					a44_ = ioio_.openAnalogInput(44);
					a45_ = ioio_.openAnalogInput(45);
					// Setup analog outputs
					a46_ = ioio_.openPwmOutput(46, 100);
				}
			
			// Read and write inputs and outputs
			@Override
			public void loop() throws ConnectionLostException, InterruptedException {
					
				// Read input and set PWM out
				IOIOdata.a44 = a44_.read(); // GSR sensor
				IOIOdata.a45 = a45_.read(); // light sensor
				
				// Check if there has been a rapid change of event
				lightEvent = lightEventObj.checkEvent(IOIOdata.a45, 0.05);
				IOIOdata.resetEvents();
				if(lightEvent==true){
					tuneObj_.playTune(2);
					IOIOdata.a45event = 1;
				}
				
				// Set the pwm output
				a46_.setDutyCycle( tuneObj_.checkMe() );
				//a46_.setDutyCycle((float) 0.0 );
				
				broadcastVars();
				
				//Log.d("helloIOIOService.java", "IOIO "+ "a44:"+IOIOdata.a44+" "+"a45:"+IOIOdata.a45); 
				
				// Async script to flash on-board LED
				counter++;
				if(counter>=(threadInterval)){
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
		private boolean event = false;
		private boolean checkEvent(double val, double range){
			double plus = val-lastVal;
			double minus = lastVal-val;
			if(plus>=range || minus>=range){
				Log.d(TAG, "IOIO event"+"plus:"+plus+" val:"+val+" gsr:"+IOIOdata.a44 );
				event = true;
			}else{
				event = false;
			}
			lastVal = val;
			return event; 
		}
	}

	// Remove noise from a variable list
	private class smoothVar {
		private int test = 1;
		private double getVar(){
			return 0.0;
		}
	}
	
	// A class to manage random generation of a float over time
	private class tuneManager {
		// Setup vars
		private int setpwm = 0;
		private int interval = 2;
		private float rand = 0.0f;
		private int timer = 30; 
		private int timeout = 30;		
		// Calculate random note & interval
		private float checkMe() {
			timer--;
			if(timer>=0){	
				setpwm++;	
				if(setpwm>=interval){
					rand = (float) Math.random();		
					setpwm = 0;
					float rand2 = (float) Math.random();
					//interval = (int) (rand2*6)+2;
				}
			}else{
				rand = 0.0f;
				timer = 0;
			}
			return rand;			
		}
		// Reset the timer soa a tune is played
		private void playTune(int newTimeout) {
			timer = newTimeout;
		}
	}

    // Broadcast a message to the IOIO plugin
    private void broadcastVars(){
    	
    	// Which vars to send  
    	broadcastIntent.putExtra("a45", IOIOdata.a45); 
    	broadcastIntent.putExtra("a45event", IOIOdata.a45event);
    	broadcastIntent.putExtra("a44", IOIOdata.a44); 
    			
    	// Send the intent
        LocalBroadcastManager.getInstance(this).sendBroadcast(broadcastIntent);
        // Log.d("helloIOIOService.java", "IOIO sending message");
    }	
    
    // This service is not bound to an activity
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
