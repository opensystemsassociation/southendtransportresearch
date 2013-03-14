package uk.org.opensystem.light_sensor;

import android.os.Bundle;
import android.app.Activity;
import android.util.Log;
import android.view.Menu;
import android.app.Activity;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Bundle;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
	 
	ProgressBar lightMeter;
	TextView textMax, textReading;
	 
	@Override
	protected void onCreate(Bundle savedInstanceState) {
		
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_main);
		lightMeter = (ProgressBar)findViewById(R.id.lightmeter);
        textMax = (TextView)findViewById(R.id.max);
        textReading = (TextView)findViewById(R.id.reading);
         
        SensorManager sensorManager = (SensorManager)getSystemService(Context.SENSOR_SERVICE);
        Sensor lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT);
      
        if (lightSensor == null){
         Toast.makeText(MainActivity.this, 
           "No Light Sensor! quit-", 
           Toast.LENGTH_LONG).show();
        }else{
         float max = lightSensor.getMaximumRange();
         lightMeter.setMax((int)max);
         textMax.setText("Max Reading: " + String.valueOf(max));
          
         sensorManager.registerListener(lightSensorEventListener, 
           lightSensor, 
           SensorManager.SENSOR_DELAY_FASTEST);
          
        }
	}
	
	SensorEventListener lightSensorEventListener = new SensorEventListener(){
 
		@Override
		public void onAccuracyChanged(Sensor sensor, int accuracy) {
		// TODO Auto-generated method stub
		    
		}

		@Override
		public void onSensorChanged(SensorEvent event) {
			Log.d("light_sensor", String.valueOf(lightMeter.getMax()));
		   if(event.sensor.getType()==Sensor.TYPE_LIGHT){
		    float currentReading = event.values[0];
		    lightMeter.setProgress((int)currentReading);
		    textReading.setText("Current Reading: " + String.valueOf(currentReading));
		   }
		}
		
	};
	
	@Override
	public boolean onCreateOptionsMenu(Menu menu) {
		// Inflate the menu; this adds items to the action bar if it is present.
		getMenuInflater().inflate(R.menu.main, menu);
		return true;
	}

}
