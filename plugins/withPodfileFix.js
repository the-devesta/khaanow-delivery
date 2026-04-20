const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withPodfileFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(file)) return config;

      let contents = fs.readFileSync(file, 'utf8');

      const postInstallFix = [
        "  installer.pods_project.targets.each do |target|",
        "    target.build_configurations.each do |config|",
        "      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'",
        "    end",
        "    if target.name == 'Google-Maps-iOS-Utils' || target.name == 'Google-Maps-iOS-Utils-framework'",
        "      target.build_configurations.each do |config|",
        "        config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= ['$(inherited)']",
        "        config.build_settings['FRAMEWORK_SEARCH_PATHS'] << '\"${PODS_ROOT}/GoogleMaps/Maps/Frameworks\"'",
        "        config.build_settings['FRAMEWORK_SEARCH_PATHS'] << '\"${PODS_ROOT}/GoogleMaps/Base/Frameworks\"'",
        "        config.build_settings['FRAMEWORK_SEARCH_PATHS'] << '\"${PODS_XCFRAMEWORKS_BUILD_DIR}/GoogleMaps/Maps\"'",
        "        config.build_settings['FRAMEWORK_SEARCH_PATHS'] << '\"${PODS_XCFRAMEWORKS_BUILD_DIR}/GoogleMaps/Base\"'",
        "      end",
        "      # Sed fix for @import GoogleMaps;",
        "      system(\"find -E \\\"#{installer.sandbox.root}/Google-Maps-iOS-Utils/Sources/GoogleMapsUtilsObjC/include\\\" -type f -name \\\"*.h\\\" -exec sed -i \\\"\\\" \\\"s/@import GoogleMaps;/#import <GoogleMaps\\\\/GoogleMaps.h>/g\\\" {} +\")",
        "    end",
        "    if target.name == 'react-native-google-maps'",
        "      target.build_configurations.each do |config|",
        "        # Xcode 16+ module validation can fail on react-native-maps Obj-C headers when built as frameworks.",
        "        config.build_settings['CLANG_ENABLE_MODULES'] = 'NO'",
        "        config.build_settings['DEFINES_MODULE'] = 'NO'",
        "      end",
        "    end",
        "  end"
      ].join('\n');

      if (!contents.includes('FRAMEWORK_SEARCH_PATHS')) {
        contents = contents.replace(
          /post_install do \|installer\|/g,
          `post_install do |installer|\n${postInstallFix}`
        );
      }

      fs.writeFileSync(file, contents, 'utf-8');
      return config;
    },
  ]);
};

module.exports = withPodfileFix;
