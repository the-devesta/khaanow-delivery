// Dynamic Expo config that conditionally loads native Firebase plugins
// In Expo Go, the native modules aren't available, so we skip them

const IS_DEV_BUILD = process.env.EAS_BUILD || process.env.EXPO_DEV_CLIENT;

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  "AIzaSyAgvK2OviEztEkLdb3dAizrEdLDtP12pzU";

const plugins = [
  "expo-router",
  [
    "expo-splash-screen",
    {
      image: "./assets/images/DeliveryKhaaoNow.png",
      imageWidth: 250,
      resizeMode: "contain",
      backgroundColor: "#F7B731",
    },
  ],
  "expo-font",
  "expo-image",
  ["expo-location", {}],
  [
    "expo-notifications",
    {
      icon: "./assets/images/DeliveryKhaaoNow.png",
      color: "#F7B731",
    },
  ],
  "expo-status-bar",
  "expo-web-browser",
  [
    "expo-build-properties",
    {
      ios: {
        useFrameworks: "static",
        newArchEnabled: true,
      },
      android: {
        newArchEnabled: true,
      },
    },
  ],
  "./plugins/withPodfileFix.js",
];

// Only add native Firebase plugins for development/production builds (not Expo Go)
if (IS_DEV_BUILD) {
  plugins.push("@react-native-firebase/app");
  plugins.push("@react-native-firebase/auth");
}

module.exports = {
  expo: {
    name: "KhaaoNow Delivery",
    slug: "khaaonow-delivery",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/images/DeliveryKhaaoNow.png",
    scheme: "khaaonowdelivery",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    extra: {
      eas: {
        projectId: "56f92eae-29a4-46fc-94b2-623d2e2d3a72",
      },
    },
    ios: {
      supportsTablet: false,
      requireFullScreen: true,
      bundleIdentifier: "com.khaaonow.delivery",
      config: {
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
      googleServicesFile:
        process.env.IOS_GOOGLE_SERVICES_PLIST || "./GoogleService-Info.plist",
      entitlements: {
        "aps-environment": "production",
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        GMSApiKey: GOOGLE_MAPS_API_KEY,
        NSLocationWhenInUseUsageDescription:
          "Allow KhaaoNow Delivery to use your location to navigate to pickup and drop-off points.",
        NSCameraUsageDescription:
          "Allow KhaaoNow Delivery to access your camera to upload delivery photos.",
        NSPhotoLibraryUsageDescription:
          "Allow KhaaoNow Delivery to access your photos to upload delivery photos.",
        NSMicrophoneUsageDescription:
          "Allow KhaaoNow Delivery to access your microphone.",
      },
    },
    android: {
      package: "com.khaaonow.delivery",
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
      googleServicesFile:
        process.env.ANDROID_GOOGLE_SERVICES_JSON || "./google-services.json",
      adaptiveIcon: {
        backgroundColor: "#F7B731",
        foregroundImage: "./assets/images/DeliveryKhaaoNow.png",
      },
      edgeToEdgeEnabled: true,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "khaaonowdelivery",
              host: "auth",
              pathPrefix: "/callback",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/DeliveryKhaaoNow.png",
    },
    plugins: plugins,
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
