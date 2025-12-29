// @ts-ignore - expo-location types will be available after npm install
import * as Location from 'expo-location';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationPermissionResult {
  granted: boolean;
  message?: string;
}

/**
 * Request location permissions
 */
export const requestLocationPermission = async (): Promise<LocationPermissionResult> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      return {
        granted: false,
        message: 'Location permission is required to use this app',
      };
    }
    
    return {
      granted: true,
    };
  } catch (error) {
    console.error('Request location permission error:', error);
    return {
      granted: false,
      message: 'Failed to request location permission',
    };
  }
};

/**
 * Get current location
 */
export const getCurrentLocation = async (): Promise<LocationCoordinates | null> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      const permissionResult = await requestLocationPermission();
      if (!permissionResult.granted) {
        return null;
      }
    }
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Get current location error:', error);
    return null;
  }
};

/**
 * Watch location changes
 */
export const watchLocation = async (
  callback: (location: LocationCoordinates) => void,
  interval: number = 15000 // 15 seconds
): Promise<{ remove: () => void } | null> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      const permissionResult = await requestLocationPermission();
      if (!permissionResult.granted) {
        return null;
      }
    }
    
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: interval,
        distanceInterval: 10, // 10 meters
      },
      (location: any) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    );
    
    return subscription;
  } catch (error) {
    console.error('Watch location error:', error);
    return null;
  }
};

/**
 * Calculate distance between two coordinates (in kilometers)
 * Using Haversine formula
 */
export const calculateDistance = (
  from: LocationCoordinates,
  to: LocationCoordinates
): number => {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for display
 */
export const formatDistance = (distanceInKm: number): string => {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)} m`;
  }
  return `${distanceInKm.toFixed(1)} km`;
};

/**
 * Estimate time based on distance (assuming average speed of 20 km/h)
 */
export const estimateTime = (distanceInKm: number, speedKmh: number = 20): string => {
  const timeInHours = distanceInKm / speedKmh;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  if (timeInMinutes < 60) {
    return `${timeInMinutes} min`;
  }
  
  const hours = Math.floor(timeInMinutes / 60);
  const minutes = timeInMinutes % 60;
  
  return `${hours}h ${minutes}min`;
};

/**
 * Check if location services are enabled
 */
export const isLocationEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    return enabled;
  } catch (error) {
    console.error('Check location enabled error:', error);
    return false;
  }
};

/**
 * Get location permission status
 */
export const getLocationPermissionStatus = async (): Promise<string> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status;
  } catch (error) {
    console.error('Get location permission status error:', error);
    return 'undetermined';
  }
};

export default {
  requestLocationPermission,
  getCurrentLocation,
  watchLocation,
  calculateDistance,
  formatDistance,
  estimateTime,
  isLocationEnabled,
  getLocationPermissionStatus,
};
