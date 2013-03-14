package uk.org.opensystem.plugin;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Timer;
import java.util.TimerTask;

import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.apache.cordova.api.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import uk.org.opensystem.R;

import android.app.Activity;
import android.graphics.ImageFormat;
import android.hardware.Camera;
import android.os.AsyncTask;
import android.os.Environment;
import android.util.Log;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

/**
 * This class echoes a string called from JavaScript.
 */
public class CameraAccessNoUserAction extends CordovaPlugin {
    
	private static final String TAG = "CameraAccessNoUserAction";
	
	private Activity activity=null;
	private CallbackContext callbackContext=null;
	
	private SurfaceView preview=null;
    private SurfaceHolder previewHolder=null;
    private Camera camera=null;
    
    private boolean inPreview=false;
    private boolean cameraConfigured=false;
    
    private Timer timer = new Timer();

    private String imageDirectory = null;
    private String imageName = null;
    
	@Override
	public boolean execute(String action, JSONArray args, final CallbackContext cbContext) throws JSONException {

		if ("takePicture".equals(action)) {    
			// Save image here.
			imageDirectory = args.getString(0);
			imageName = args.getString(1);
			
			// Start UI thread in order to show preview.
	    	cordova.getActivity().runOnUiThread(new Runnable() {
	            public void run() {
	            	
	            	activity = cordova.getActivity(); 
	            	callbackContext = cbContext;

	            	preview=(SurfaceView)activity.findViewById(R.id.preview);

	            	    
	            	if (camera == null) {
	            		Log.d(TAG, "Camera DID NOT exist.");
		                camera=Camera.open();
	                }
	            	
	                if( preview == null ) {

	                	activity.setContentView(R.layout.surface);

		                preview=(SurfaceView)activity.findViewById(R.id.preview);	            	
		                previewHolder=preview.getHolder();
		                previewHolder.addCallback(surfaceCallback);
		                previewHolder.setType(SurfaceHolder.SURFACE_TYPE_PUSH_BUFFERS);
		                
		                
	                } else {
	                	
	                	// Preview already started. Take another picture.
	                	Log.d(TAG, "width:" + String.valueOf(preview.getWidth()));
	                	initPreview(preview.getWidth(), preview.getHeight());
	                	takePicture();
	                }
	                return;		

	            }
	        });
	        return true;
	    }
	    return false;
	}

	private void takePicture() {
		
        if (camera == null) {
            camera=Camera.open();
        }
        
        camera.startPreview();
        camera.takePicture(null, null, photoCallback);
        
	}
	
    private void initPreview(int width, int height) {
        if (camera != null && previewHolder.getSurface() != null) {
            try {
                camera.setPreviewDisplay(previewHolder);
            }
            catch (Throwable t) {
                Log.e("PreviewDemo-surfaceCallback",
                        "Exception in setPreviewDisplay()", t);
                Toast.makeText(activity, t.getMessage(),
                        Toast.LENGTH_LONG).show();
                
                callbackContext.error("Failed to set preview display");
            }

            if (!cameraConfigured) {
                Camera.Parameters parameters=camera.getParameters();
                Camera.Size size=getBestPreviewSize(width, height, parameters);
                Camera.Size pictureSize=getSmallestPictureSize(parameters);
                Log.d(TAG, "cameraConfiguring");
                
                if (size != null && pictureSize != null) {
                    parameters.setPreviewSize(size.width, size.height);
                    parameters.setPictureSize(pictureSize.width,
                            pictureSize.height);
                    parameters.setPictureFormat(ImageFormat.JPEG);
                    camera.setParameters(parameters);
                    cameraConfigured=true;
                 }
            }
        }
    }
    
    private Camera.Size getBestPreviewSize(int width, int height,
            Camera.Parameters parameters) {
        Camera.Size result=null;

        for (Camera.Size size : parameters.getSupportedPreviewSizes()) {
            if (size.width <= width && size.height <= height) {
                if (result == null) {
                    result=size;
                }
                else {
                    int resultArea=result.width * result.height;
                    int newArea=size.width * size.height;

                    if (newArea > resultArea) {
                        result=size;
                    }
                }
            }
        }

        return(result);
    }

    private Camera.Size getSmallestPictureSize(Camera.Parameters parameters) {
        Camera.Size result=null;

        for (Camera.Size size : parameters.getSupportedPictureSizes()) {
            if (result == null) {
                result=size;
            }
            else {
                int resultArea=result.width * result.height;
                int newArea=size.width * size.height;

                if (newArea < resultArea) {
                    result=size;
                }
            }
        }

        return(result);
    }

	SurfaceHolder.Callback surfaceCallback=new SurfaceHolder.Callback() {
        public void surfaceCreated(SurfaceHolder holder) {
            // no-op -- wait until surfaceChanged()
            
        }

        public void surfaceChanged(SurfaceHolder holder, int format,
                int width, int height) {
        	initPreview(width, height);
        	camera.startPreview();
            takePicture();
        }

        public void surfaceDestroyed(SurfaceHolder holder) {
            // no-op
        }
    };
    

    Camera.PictureCallback photoCallback=new Camera.PictureCallback() {
        public void onPictureTaken(byte[] data, Camera c) {
        	Log.d(TAG, String.valueOf(callbackContext == null));
            
        	//callbackContext.success("Picture taken. Byte length: " + String.valueOf(data.length));
        	
        	new SavePhotoTask().execute(data);
        	
        	camera.stopPreview();
        	camera.release();
        	cameraConfigured = false;
        	camera = null;
        	
        }
    };

    class SavePhotoTask extends AsyncTask<byte[], String, String> {
        @Override
        protected String doInBackground(byte[]... jpeg) {
            
        	File photo = new File(Environment.getExternalStoragePublicDirectory(imageDirectory),
                        imageName);
            
            Log.d(TAG, Environment.getExternalStoragePublicDirectory(imageDirectory).getAbsolutePath() + "/" + imageName);
            
            // Create the storage directory if it does not exist
            if (! photo.exists()){
                if (! photo.mkdirs()){
                    Log.d(TAG, "failed to create directory");
                    callbackContext.error("Failed to write");
                    return null;
                }
            }
            
            if (photo.exists()) {
                photo.delete();
            }

            try {
                FileOutputStream fos=new FileOutputStream(photo.getPath());

                fos.write(jpeg[0]);
                fos.close();
                
                callbackContext.success(Environment.getExternalStoragePublicDirectory(imageDirectory).getAbsolutePath() + "/" + imageName);
            }
            catch (java.io.IOException e) {
                Log.e("PictureDemo", "Exception in photoCallback", e);
                callbackContext.error("Failed to write");
            }

            return(null);
        }
    }

}