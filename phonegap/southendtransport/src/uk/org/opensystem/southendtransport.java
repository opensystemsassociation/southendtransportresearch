/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
 */

package uk.org.opensystem;

import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;

import android.view.WindowManager;
import android.view.Window;

import org.apache.cordova.*;

import ioio.lib.api.AnalogInput;
import ioio.lib.api.DigitalOutput;
import ioio.lib.api.IOIO;
import ioio.lib.api.PwmOutput;
import ioio.lib.api.exception.ConnectionLostException;
import ioio.lib.util.BaseIOIOLooper;
import ioio.lib.util.IOIOLooper;
import ioio.lib.util.android.IOIOActivity;


public class southendtransport extends DroidGap
{
    //public ioioObj = new MainActivity();

    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        // Set by <content src="index.html" /> in config.xml
        
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        appView.addJavascriptInterface(this, "IOIOActivity");

        super.loadUrl(Config.getStartUrl());
        //super.loadUrl("file:///android_asset/www/index.html")

    }
    
    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.camera_menu, menu);
        return true;
    }
    
    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle item selection
        switch (item.getItemId()) {
        case R.id.switch_cam:
        	Log.d("southendtransport.java", "Hide - show cam");
          this.sendJavascript("javascript: stp.switchCamera()");
          return true;
        case R.id.stop_activity:
        	Log.d("southendtransport.java", "Schttop");
          this.sendJavascript("javascript: stp.stopActivity()");
          return true;
        default:
          return super.onOptionsItemSelected(item);
        }
    }

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
}

