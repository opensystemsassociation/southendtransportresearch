package uk.org.opensystem;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.os.IBinder;
import android.os.Binder;
import android.support.v4.content.LocalBroadcastManager;
import android.util.Log;
import ioio.lib.api.DigitalOutput;
import ioio.lib.api.IOIO;
import ioio.lib.api.exception.ConnectionLostException;
import ioio.lib.util.BaseIOIOLooper;
import ioio.lib.util.IOIOLooper;
import ioio.lib.util.android.IOIOService;
import android.app.Activity;

import java.util.Random;

import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.Message;
import android.os.Messenger;
import java.util.Date;
import android.content.Context;
import android.app.Service;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.BroadcastReceiver;


import uk.org.opensystem.R;
import uk.org.opensystem.R.drawable;
import uk.org.opensystem.plugin.IOIOconnect;
import org.apache.cordova.*;


/**
 * An example IOIO service. While this service is alive, it will attempt to
 * connect to a IOIO and blink the LED. A notification will appear on the
 * notification bar, enabling the user to stop the service.
 * For external communications try: https://github.com/nickfox/Update-Android-UI-from-a-Service
 */
public class HelloIOIOService extends IOIOService {
	private static String TAG = "IOIOService";
	private int interval = 1000;
	private boolean onoff  = false;
	private int counter = 0;

    // USUAL IOIO SERVICE STUFF
	@Override
	public void onStart(Intent intent, int startId) {  
		
		// Service has been started
		super.onStart(intent, startId);
		Log.d("helloIOIOService.java", "IOIO started service");
		
		// Send a message
		broadcastMessage();
		
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

			@Override
			protected void setup() throws ConnectionLostException,
				InterruptedException {
					led_ = ioio_.openDigitalOutput(IOIO.LED_PIN);
				}

			@Override
			public void loop() throws ConnectionLostException,
				InterruptedException {
					led_.write(onoff);
					Thread.sleep(interval);
					led_.write(onoff);
					Thread.sleep(interval);
					onoff = !onoff;
					counter++;
					if(counter>=2) interval = 60;
					broadcastMessage();
			}
		};
	}

    // Broadcast a message to the IOIO plugin
    private void broadcastMessage(){
    	// Create an intent and store vars in it
    	Intent intent = new Intent("speedExceeded");
    	int currentSpeed = 1, 
    		latitude = 2, 
    		longitude=3;
        intent.putExtra("currentSpeed", currentSpeed);
        intent.putExtra("latitude", latitude);
        intent.putExtra("longitude", longitude); 
        // Send the intent
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    	Log.d("helloIOIOService.java", "IOIO sending message");
    }	
    
    // This service is not bound to an activity
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
