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

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.support.v4.content.LocalBroadcastManager;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;

import android.view.WindowManager;
import android.view.Window;

import org.apache.cordova.*;


public class southendtransport extends DroidGap 
{

    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        // Set by <content src="index.html" /> in config.xml
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.loadUrl(Config.getStartUrl());
        //super.loadUrl("file:///android_asset/www/index.html")
        
        
        LocalBroadcastManager.getInstance(this).registerReceiver(
                mMessageReceiver, 
                new IntentFilter("speedExceeded")
        );
        
           
    }
    
    private BroadcastReceiver mMessageReceiver = new BroadcastReceiver() {
    	@Override
    	public void onReceive(Context context, Intent intent) {
    		String action = intent.getAction();
    		Double currentSpeed = intent.getDoubleExtra("currentSpeed", 20);
    		Double currentLatitude = intent.getDoubleExtra("latitude", 0);
    		Double currentLongitude = intent.getDoubleExtra("longitude", 0);
    		//  ... react to local broadcast message
    		Log.d("southendtransport.java", "IOIO got local message.. ");
    	}
    };
    
    // CAMERA CONTROL
    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.camera_menu, menu);
        return true;
    }
    
    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle item selection
        switch (item.getItemId()) {
        case R.id.choose_env:
        	Log.d("southendtransport.java", "Choose env");
            this.sendJavascript("javascript: stp.chooseEnv()");
            return true;
        case R.id.stop_activity:
        	Log.d("southendtransport.java", "Schttop");
            this.sendJavascript("javascript: stp.stopActivity()");
            return true;
        default:
            return super.onOptionsItemSelected(item);
        }
    }

}

