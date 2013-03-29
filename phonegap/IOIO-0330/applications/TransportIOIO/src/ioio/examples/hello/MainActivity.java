package ioio.examples.hello;

import ioio.lib.api.DigitalOutput;
//import ioio.lib.api.AnalogInput;
//import ioio.lib.api.IOIO;
//import ioio.lib.api.PwmOutput;
import ioio.lib.api.exception.ConnectionLostException;
import ioio.lib.util.BaseIOIOLooper;
import ioio.lib.util.IOIOLooper;
import ioio.lib.util.android.IOIOActivity;

import android.os.Bundle;
import android.util.Log;
//import android.view.Menu;
//import android.view.MenuItem;
//import android.view.WindowManager;
//import android.view.Window;

import org.apache.cordova.*;



// The main activity of IOIO 
public class MainActivity extends IOIOActivity {
	
	private SouthendTransport transObj;

	// Called when the activity is first created. 
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState); 
		transObj = new SouthendTransport();
	}


	private class SouthendTransport extends DroidGap {
		// Called when the activity is first created. 
		@Override
		public void onCreate(Bundle savedInstanceState) {
			super.onCreate(savedInstanceState); 
			Log.d("Started IOIO SouthendTransport", "IOIO TESTER");
	    }
	}
}
