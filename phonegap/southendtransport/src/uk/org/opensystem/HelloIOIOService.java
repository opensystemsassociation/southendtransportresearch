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
import org.apache.cordova.*;


/**
 * An example IOIO service. While this service is alive, it will attempt to
 * connect to a IOIO and blink the LED. A notification will appear on the
 * notification bar, enabling the user to stop the service.
 * For external communications try: https://github.com/nickfox/Update-Android-UI-from-a-Service
 */
public class HelloIOIOService extends IOIOService {
	private static String TAG = "helloIOIOService.java";
	private int interval = 500;
	private boolean onoff  = false;
	private int counter = 0;
	private Intent broadcastIntent = new Intent("speedExceeded");
	private IOIOdataObj IOIOdata = new IOIOdataObj();
	
	// An object to store IOIO vars in
	private class IOIOdataObj {
		// Location to store pin values 
		int 
		p1=-1,p2=-1,p3=-1,p4=-1,p5=-1,p6=-1,p7=-1,p8=-1,p9=-1,p10=-1,
		p11=-1,p12=-1,p13=-1,p14=-1,p15=-1,p16=-1,p17=-1,p18=-1,p19=-1,p20=-1,
		p21=-1,p22=-1,p23=-1,p24=-1,p25=-1,p26=-1,p27=-1,p28=-1,p29=-1,p30=-1,
		p31=-1,p32=-1,p33=-1,p34=-1,p35=-1,p36=-1,p37=-1,p38=-1,p39=-1,p40=-1,
		p41=-1,p42=-1,p43=-1,p44=-1,p45=-1,p46=-1,p47=-1,p48=-1;
	}
	
    // USUAL IOIO SERVICE STUFF
	@Override
	public void onStart(Intent intent, int startId) {  
		
		// Service has been started
		super.onStart(intent, startId);
		Log.d(TAG, "IOIO started service");
		
		// Send a message
		broadcastVars();
		
        // IOIO When service is started load external vars (if set)
		int loadinterval = intent.getIntExtra("loadinterval", -1);
		if(loadinterval>=0){ interval = loadinterval; }
	        
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
			private AnalogInput input_;
			private PwmOutput pwmOutput_;
			private int pwmCounter = 0;

			@Override
			protected void setup() throws ConnectionLostException,
				InterruptedException {
					led_ = ioio_.openDigitalOutput(IOIO.LED_PIN);
					input_ = ioio_.openAnalogInput(45);
					pwmOutput_ = ioio_.openPwmOutput(46, 100);
				}

			@Override
			public void loop() throws ConnectionLostException,
				InterruptedException {
					
					// Set PWM out
					pwmOutput_.setPulseWidth(500+(counter*10));
				
					// Async script to flash onboard LED
					counter++;
					if(counter>=(interval/10)){
						onoff = !onoff;
						led_.write(onoff);
						counter=0;
						broadcastVars();
					}	
					Thread.sleep(100);

			}
		};
	}

    // Broadcast a message to the IOIO plugin
    private void broadcastVars(){
    	// Which vars to send
    	broadcastIntent.putExtra("interval", interval);    
    	broadcastIntent.putExtra("P1", IOIOdata.p5); 
        
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
