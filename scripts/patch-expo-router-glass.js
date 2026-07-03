#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo-router",
  "build",
  "fork",
  "native-stack",
  "createNativeStackNavigator.js",
);

if (!fs.existsSync(target)) {
  console.warn("[patch-expo-router-glass] expo-router native stack file not found");
  process.exit(0);
}

let source = fs.readFileSync(target, "utf8");

source = source.replace(
  'const expo_glass_effect_1 = require("expo-glass-effect");\n',
  "",
);
source = source.replace(
  "const GLASS = (0, expo_glass_effect_1.isLiquidGlassAvailable)();",
  "const GLASS = false;",
);

fs.writeFileSync(target, source);
console.log("[patch-expo-router-glass] disabled Expo Router liquid glass runtime check");
