// Dynamic Expo config for EAS/Expo builds.

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  "AIzaSyAgvK2OviEztEkLdb3dAizrEdLDtP12pzU";

const plugins = [
  "expo-router",
  [
    "expo-splash-screen",
    {
      image: "./assets/images/logo.png",
      imageWidth: 260,
      resizeMode: "contain",
      backgroundColor: "#111111",
    },
  ],
  "expo-font",
  "expo-image",
  ["expo-location", {}],
  [
    "expo-notifications",
    {
      icon: "./assets/images/DeliveryKhaaoNow.png",
      color: "#FFD230",
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
        deploymentTarget: "16.4",
      },
      android: {
        newArchEnabled: true,
      },
    },
  ],
  [
    "react-native-maps",
    {
      iosGoogleMapsApiKey: GOOGLE_MAPS_API_KEY,
      androidGoogleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
  ],
  "./plugins/withPodfileFix.js",
];

module.exports = {
  expo: {
    name: "KhaaoNow Delivery",
    slug: "khaaonow-delivery",
    version: "1.0.4",
    orientation: "portrait",
    icon: "./assets/images/DeliveryKhaaoNow.png",
    scheme: "khaaonowdelivery",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    autolinking: {
      ios: {
        exclude: ["@expo/ui", "expo-glass-effect", "expo-symbols"],
      },
      android: {
        exclude: ["@expo/ui", "expo-glass-effect", "expo-symbols"],
      },
    },
    extra: {
      eas: {
        projectId: "56f92eae-29a4-46fc-94b2-623d2e2d3a72",
      },
    },
    ios: {
      supportsTablet: false,
      requireFullScreen: true,
      bundleIdentifier: "com.khaaonow.delivery",
      buildNumber: "2026071003",
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
        LSApplicationQueriesSchemes: ["comgooglemaps"],
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
      versionCode: 2026071003,
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
      googleServicesFile:
        process.env.ANDROID_GOOGLE_SERVICES_JSON || "./google-services.json",
      adaptiveIcon: {
        backgroundColor: "#FFD230",
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
