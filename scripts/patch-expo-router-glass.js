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

const expoFontRecords = path.join(__dirname, "..", "node_modules", "expo-font", "ios", "FontUtilsRecords.swift");
const expoFontModule = path.join(__dirname, "..", "node_modules", "expo-font", "ios", "FontUtilsModule.swift");

if (fs.existsSync(expoFontRecords) && fs.existsSync(expoFontModule)) {
  let records = fs.readFileSync(expoFontRecords, "utf8");
  records = records.replace("import SwiftUI\n", "import UIKit\n");
  records = records.replace("@Field var color: Color = .black", "@Field var color: String = \"#000000\"");
  fs.writeFileSync(expoFontRecords, records);

  let module = fs.readFileSync(expoFontModule, "utf8");
  module = module.replace(".foregroundColor: UIColor(options.color)", ".foregroundColor: EXUtilities.uiColor(options.color)");
  fs.writeFileSync(expoFontModule, module);
  console.log("[patch-expo-router-glass] patched ExpoFont SwiftUI color usage for Xcode 26");
}
