import { Location } from "@/store/orders";
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

interface DeliveryMapProps {
  driverLocation: Location;
  pickupLocation?: Location;
  dropLocation?: Location;
  showRoute?: boolean;
}

export default function DeliveryMap({
  driverLocation,
  pickupLocation,
  dropLocation,
  showRoute = true,
}: DeliveryMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (mapRef.current && pickupLocation && dropLocation) {
      const coordinates = [pickupLocation, dropLocation];
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });
    }
  }, [pickupLocation, dropLocation]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        <Marker
          coordinate={driverLocation}
          title="Your Location"
          pinColor="#FF6A00"
        />

        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title="Pickup"
            pinColor="#3B82F6"
          />
        )}

        {dropLocation && (
          <Marker coordinate={dropLocation} title="Drop" pinColor="#10B981" />
        )}

        {showRoute && pickupLocation && dropLocation && (
          <Polyline
            coordinates={[pickupLocation, driverLocation, dropLocation]}
            strokeColor="#FF6A00"
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});
