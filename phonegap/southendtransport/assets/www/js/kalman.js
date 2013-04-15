var STP = STP || {};

STP.KalmanLatLong = function (Q_metres_per_second) {

    var props = {};
    var TimeStamp_milliseconds,
        MinAccuracy = 1,
        lat,
        lng,
        variance = -1; // P matrix.  Negative means object uninitialised.  NB: units irrelevant, as long as same units used throughout

    props.process = function( lat_measurement, lng_measurement, accuracy, ntimestamp ) {

        if (accuracy < MinAccuracy) accuracy = MinAccuracy;
        if (variance < 0) {
            // if variance < 0, object is unitialised, so initialise with current values
            TimeStamp_milliseconds = ntimestamp;
            lat=lat_measurement; lng = lng_measurement; variance = accuracy*accuracy; 
        } else {
            // else apply Kalman filter methodology

            var TimeInc_milliseconds = ntimestamp - TimeStamp_milliseconds;
            if (TimeInc_milliseconds > 0) {
                // time has moved on, so the uncertainty in the current position increases
                variance += TimeInc_milliseconds * Q_metres_per_second * Q_metres_per_second / 1000;
                TimeStamp_milliseconds = ntimestamp;
                // TO DO: USE VELOCITY INFORMATION HERE TO GET A BETTER ESTIMATE OF CURRENT POSITION
            }

            // Kalman gain matrix K = Covarariance * Inverse(Covariance + MeasurementVariance)
            // NB: because K is dimensionless, it doesn't matter that variance has different units to lat and lng
            var K = variance / (variance + accuracy * accuracy);
            // apply K
            lat += K * (lat_measurement - lat);
            lng += K * (lng_measurement - lng);
            // new Covarariance  matrix is (IdentityMatrix - K) * Covarariance 
            variance = (1 - K) * variance;
        }

    }

    props.getLong = function() {
        return lng;
    }
    props.getLat = function() {
        return lat;
    }
    props.getAccuracy = function() {
        return accuracy;
    }
    props.setState = function( nlat, nlng, naccuracy, ntimestamp ){
        lat=nlat;
        lng=nlng;
        accuracy = naccuracy;
        TimeStamp_milliseconds = ntimestamp;

        process();
    };

    return props;
};
