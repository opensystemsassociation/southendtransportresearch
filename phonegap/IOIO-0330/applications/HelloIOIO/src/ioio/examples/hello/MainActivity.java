package ioio.examples.hello;

import ioio.lib.api.DigitalOutput;
import ioio.lib.api.exception.ConnectionLostException;
import ioio.lib.util.BaseIOIOLooper;
import ioio.lib.util.IOIOLooper;
import ioio.lib.util.android.IOIOActivity;
import android.os.Bundle;

// The main activity of IOIO 
public class MainActivity extends IOIOActivity {

	// Called when the activity is first created. 
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState); 
	}

	// The thread on which all the IOIO activity happens. 
	class Looper extends BaseIOIOLooper {
		/** The on-board LED. */
		private DigitalOutput led_;

		// Called every time a connection with IOIO has been established.
		@Override
		protected void setup() throws ConnectionLostException {
			led_ = ioio_.openDigitalOutput(0, true);
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

	//  A method to create our IOIO thread.
	@Override
	protected IOIOLooper createIOIOLooper() {
		return new Looper();
	}
}