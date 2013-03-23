package uk.org.opensystem.plugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;
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
import android.app.AlertDialog;
import android.content.Context;
import android.graphics.ImageFormat;
import android.hardware.Camera;
import android.hardware.Camera.CameraInfo;
import android.hardware.Camera.Size;
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

	private Activity activity = null;
	private CallbackContext callbackContext = null;

    private Preview mPreview=null;
    Camera mCamera;
    int numberOfCameras;
    int cameraCurrentlyLocked;

    // The first rear facing camera
    int defaultCameraId;
	private String imageDirectory = null;
	private String imageName = null;

	@Override
	public boolean execute(String action, JSONArray args,
			final CallbackContext cbContext) throws JSONException {
    	
		Log.d(TAG, "***ACTION: " + action);
		
		callbackContext = cbContext;

		if ("switchCamera".equals(action)) {
			
			if( mPreview != null ) {
				
	            /* TODO - Nice to have. Doesn't work right now. 
	            //check for availability of multiple cameras
	            if (numberOfCameras == 1) {
	            	Log.d(TAG, "Only 1 camera.");
	                return true;
	            }

	            // OK, we have multiple cameras.
	            // Release this camera -> cameraCurrentlyLocked
	            if (mCamera != null) {
	                mCamera.stopPreview();
	                mPreview.setCamera(null);
	                mCamera.release();
	                mCamera = null;
	            }

	            // Acquire the next camera and request Preview to reconfigure
	            // parameters.
	            mCamera = Camera
	                    .open((cameraCurrentlyLocked + 1) % numberOfCameras);
	            cameraCurrentlyLocked = (cameraCurrentlyLocked + 1)
	                    % numberOfCameras;
	            mPreview.switchCamera(mCamera);

	            // Start the preview
	            mCamera.startPreview();
	            return true;
	            */
	            
			}
			return true;
		}
		
		if ("takePicture".equals(action)) {
			// Save image here.
			imageDirectory = args.getString(0);
			imageName = args.getString(1);				
			
			takePicture();
				
			return true;
		}
		
		if ("prepareCamera".equals(action)) {
			
			// Start UI thread in order to show preview.
			cordova.getActivity().runOnUiThread(new Runnable() {
				
				public void run() {
					
					activity = cordova.getActivity();
					
			        if( mPreview == null ) {
			        	
			            // Create a RelativeLayout container that will hold a SurfaceView,
			            // and set it as the content of our activity.
			            mPreview = new Preview(activity, callbackContext);
			            ViewGroup.LayoutParams params = new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
			            activity.addContentView(mPreview, params);
			            // activity.setContentView(mPreview);
			            
			            // Find the total number of cameras available
			            numberOfCameras = Camera.getNumberOfCameras();

			            // Find the ID of the default camera
			            CameraInfo cameraInfo = new CameraInfo();
		                for (int i = 0; i < numberOfCameras; i++) {
		                    Camera.getCameraInfo(i, cameraInfo);
		                    if (cameraInfo.facing == CameraInfo.CAMERA_FACING_BACK) {
		                        defaultCameraId = i;
		                    }
		                }
			        }
				      
			        if(mCamera == null) {
				    
			        	mCamera = Camera.open();
				        cameraCurrentlyLocked = defaultCameraId;
				        mPreview.setCamera(mCamera);
			        }
			        
					// return; // is this necessary?

				}
			});
			return true;
		}

		if ("releaseCamera".equals(action)) {

			activity = cordova.getActivity();
			callbackContext = cbContext;
			
	        // Because the Camera object is a shared resource, it's very
	        // important to release.
	        if (mCamera != null) {
	            // mPreview.setCamera(null);
	            mCamera.release();
	            // mCamera = null;
	        }
	        
	        // Send result back to PhoneGap.
	        JSONObject data = new JSONObject();
	        data.put( "action", action );
	        PluginResult result = new PluginResult(PluginResult.Status.OK, data);
	        // Ensure callback stays active.
	        result.setKeepCallback(true); 
	        callbackContext.sendPluginResult(result);
			
	 	    return true;
		}

		return false;
	}
	 
	private void takePicture() {

		if (mCamera == null) {
			return;
		}

		mCamera.takePicture(null, null, photoCallback);

	}	
	
	Camera.PictureCallback photoCallback = new Camera.PictureCallback() {
		public void onPictureTaken(byte[] data, Camera c) {
			Log.d(TAG, String.valueOf(callbackContext == null));
			Log.d(TAG, "Are we ins here intead? " + String.valueOf(data.length));
			
			new SavePhotoTask().execute(data);
			mPreview.reset();
		}
	};

	class SavePhotoTask extends AsyncTask<byte[], String, String> {
		@Override
		protected String doInBackground(byte[]... jpeg) {

			Log.d(TAG, imageDirectory + "/" + imageName);
			File photo = new File(imageDirectory, imageName);

			// Create the storage directory if it does not exist
			if (!photo.exists()) {
				if (!photo.mkdirs()) {
					Log.d(TAG, "failed to create directory");
					callbackContext.error("Failed to write");
					return null;
				}
			}

			if (photo.exists()) {
				photo.delete();
			}

			try {
				FileOutputStream fos = new FileOutputStream(photo.getPath());

				fos.write(jpeg[0]);
				fos.close();

				Log.d(TAG, "ISIT NULL? " + String.valueOf(callbackContext == null));
				
				// Send result back to PhoneGap.
		        JSONObject resultData = new JSONObject();
		        resultData.put( "action", "takePicture" ).put("filename", imageDirectory + "/" + imageName);
		        PluginResult result = new PluginResult(PluginResult.Status.OK, resultData);
		        // Ensure callback stays active.
		        result.setKeepCallback(true); 
		        callbackContext.sendPluginResult(result);
				
				
			} catch (java.io.IOException e) {
				Log.e(TAG, "Exception in photoCallback", e);
				callbackContext.error("Failed to write");
			} catch (JSONException e) {
				Log.e(TAG, "JSON Exception", e);
			}

			return (null);
		}
	}
}


//----------------------------------------------------------------------

/**
* A simple wrapper around a Camera and a SurfaceView that renders a centered preview of the Camera
* to the surface. We need to center the SurfaceView because not all devices have cameras that
* support preview sizes at the same aspect ratio as the device's display.
*/
class Preview extends ViewGroup implements SurfaceHolder.Callback {
	private final String TAG = "Preview";
	
	SurfaceView mSurfaceView;
	SurfaceHolder mHolder;
	Size mPreviewSize;
	List<Size> mSupportedPreviewSizes;
	Camera mCamera;
	
	CallbackContext callbackContext;
	
	Preview(Context context, CallbackContext callbackContext) {
	   super(context);
	
	   mSurfaceView = new SurfaceView(context);
	   addView(mSurfaceView);
	   
	   this.callbackContext = callbackContext;
	
	   // Install a SurfaceHolder.Callback so we get notified when the
	   // underlying surface is created and destroyed.
	   mHolder = mSurfaceView.getHolder();
	   mHolder.addCallback(this);
	   mHolder.setType(SurfaceHolder.SURFACE_TYPE_PUSH_BUFFERS);
	}
	
	public void setCamera(Camera camera) {
	   mCamera = camera;
	   if (mCamera != null) {
	       mSupportedPreviewSizes = mCamera.getParameters().getSupportedPreviewSizes();
	       requestLayout();
	   }
	}
	
	public void switchCamera(Camera camera) {
	  setCamera(camera);
	  try {
	      camera.setPreviewDisplay(mHolder);
	  } catch (IOException exception) {
	      Log.e(TAG, "IOException caused by setPreviewDisplay()", exception);
	  }
	  Camera.Parameters parameters = camera.getParameters();
	  parameters.setPreviewSize(mPreviewSize.width, mPreviewSize.height);
	  requestLayout();
	
	  camera.setParameters(parameters);
	}
	
	@Override
	protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
	   // We purposely disregard child measurements because act as a
	   // wrapper to a SurfaceView that centers the camera preview instead
	   // of stretching it.
	   final int width = resolveSize(getSuggestedMinimumWidth(), widthMeasureSpec);
	   final int height = resolveSize(getSuggestedMinimumHeight(), heightMeasureSpec);
	   setMeasuredDimension(width, height);
	
	   if (mSupportedPreviewSizes != null) {
	       mPreviewSize = getOptimalPreviewSize(mSupportedPreviewSizes, width, height);
	   }
	}
	
	@Override
	protected void onLayout(boolean changed, int l, int t, int r, int b) {
	   if (changed && getChildCount() > 0) {
	       final View child = getChildAt(0);
	
	       final int width = r - l;
	       final int height = b - t;
	
	       int previewWidth = width;
	       int previewHeight = height;
	       if (mPreviewSize != null) {
	           previewWidth = mPreviewSize.width;
	           previewHeight = mPreviewSize.height;
	       }
	
	       // Center the child SurfaceView within the parent.
	       if (width * previewHeight > height * previewWidth) {
	           final int scaledChildWidth = previewWidth * height / previewHeight;
	           child.layout((width - scaledChildWidth) / 2, 0,
	                   (width + scaledChildWidth) / 2, height);
	       } else {
	           final int scaledChildHeight = previewHeight * width / previewWidth;
	           child.layout(0, (height - scaledChildHeight) / 2,
	                   width, (height + scaledChildHeight) / 2);
	       }
	   }
	}
	
	public void surfaceCreated(SurfaceHolder holder) {
	   // The Surface has been created, acquire the camera and tell it where
	   // to draw.
	   try {
	       if (mCamera != null) {
	           mCamera.setPreviewDisplay(holder);
	       }
	   } catch (IOException exception) {
	       Log.e(TAG, "IOException caused by setPreviewDisplay()", exception);
	   }
	}
	
	public void surfaceDestroyed(SurfaceHolder holder) {
	   // Surface will be destroyed when we return, so stop the preview.
	   if (mCamera != null) {
	       // mCamera.stopPreview();
	   }
	}
	
	public void reset() {
		
		mCamera.startPreview();
	}
	
	
	private Size getOptimalPreviewSize(List<Size> sizes, int w, int h) {
	   final double ASPECT_TOLERANCE = 0.1;
	   double targetRatio = (double) w / h;
	   if (sizes == null) return null;
	
	   Size optimalSize = null;
	   double minDiff = Double.MAX_VALUE;
	
	   int targetHeight = h;
	
	   // Try to find an size match aspect ratio and size
	   for (Size size : sizes) {
	       double ratio = (double) size.width / size.height;
	       if (Math.abs(ratio - targetRatio) > ASPECT_TOLERANCE) continue;
	       if (Math.abs(size.height - targetHeight) < minDiff) {
	           optimalSize = size;
	           minDiff = Math.abs(size.height - targetHeight);
	       }
	   }
	
	   // Cannot find the one match the aspect ratio, ignore the requirement
	   if (optimalSize == null) {
	       minDiff = Double.MAX_VALUE;
	       for (Size size : sizes) {
	           if (Math.abs(size.height - targetHeight) < minDiff) {
	               optimalSize = size;
	               minDiff = Math.abs(size.height - targetHeight);
	           }
	       }
	   }
	   return optimalSize;
	}
	
	public void surfaceChanged(SurfaceHolder holder, int format, int w, int h) {
	   // Now that the size is known, set up the camera parameters and begin
	   // the preview.
	   Camera.Parameters parameters = mCamera.getParameters();
	   parameters.setPreviewSize(mPreviewSize.width, mPreviewSize.height);
	   requestLayout();
	
	   mCamera.setParameters(parameters);
	   mCamera.startPreview();
	   
		// Send result back to PhoneGap.
       JSONObject resultData = new JSONObject();
       try {
			resultData.put( "action", "prepareCamera" );
		} catch (JSONException e) {
			Log.e(TAG, "JSON Exception.");
		}
       PluginResult result = new PluginResult(PluginResult.Status.OK, resultData);
       // Ensure callback stays active.
       result.setKeepCallback(true); 
       callbackContext.sendPluginResult(result);
       
	}

}

