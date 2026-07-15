#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const buildScriptPath = path.join(
  root,
  "node_modules",
  "expo-modules-jsi",
  "apple",
  "scripts",
  "build-xcframework.sh"
);

if (!fs.existsSync(buildScriptPath)) {
  console.log("ExpoModulesJSI build script not found, skipping prebuild.");
  process.exit(0);
}

const patchMarker = "KhaaoNow fallback build products";
let script = fs.readFileSync(buildScriptPath, "utf8");

if (!script.includes(patchMarker)) {
  const helperAnchor = "# --- Main ---";
  const helperSnippet = `
find_fallback_product_path() {
  local build_dir_name="$1"
  local -a candidates=()

  if [[ -n "\${BUILD_ROOT:-}" ]]; then
    candidates+=("\${BUILD_ROOT%/}/../Products/\${build_dir_name}")
  fi
  if [[ -n "\${SYMROOT:-}" ]]; then
    candidates+=("\${SYMROOT%/}/\${build_dir_name}")
  fi

  candidates+=(
    "\${HOME}/Library/Developer/Xcode/DerivedData/Build/Products/\${build_dir_name}"
    "/Volumes/External/Developer/DerivedData/Build/Products/\${build_dir_name}"
  )

  for candidate in "\${candidates[@]}"; do
    if [[ -d "\${candidate}/PackageFrameworks/\${PACKAGE_NAME}.framework" ]]; then
      echo "\${candidate}"
      return 0
    fi
  done

  return 1
}

find_fallback_generated_maps() {
  local platform="$1"
  local relative_path
  if [[ "$platform" == "macosx" ]]; then
    relative_path="GeneratedModuleMaps"
  else
    relative_path="GeneratedModuleMaps-\${platform}"
  fi

  local -a candidates=()
  if [[ -n "\${BUILD_ROOT:-}" ]]; then
    candidates+=("\${BUILD_ROOT%/}/../Intermediates.noindex/\${relative_path}")
  fi

  candidates+=(
    "\${HOME}/Library/Developer/Xcode/DerivedData/Build/Intermediates.noindex/\${relative_path}"
    "/Volumes/External/Developer/DerivedData/Build/Intermediates.noindex/\${relative_path}"
  )

  for candidate in "\${candidates[@]}"; do
    if [[ -f "\${candidate}/\${PACKAGE_NAME}-Swift.h" ]]; then
      echo "\${candidate}"
      return 0
    fi
  done

  return 1
}

bootstrap_existing_slice_hashes() {
  local expected_hash="$1"

  for platform in "\${PLATFORMS[@]}"; do
    local slice_id
    slice_id=$(platform_slice_id "$platform")
    local slice_dir="\${XCFRAMEWORK_PATH}/\${slice_id}/\${PACKAGE_NAME}.framework"
    local hash_file="\${XCFRAMEWORK_PATH}/\${slice_id}/.build-hash"

    if [[ -f "\${slice_dir}/Info.plist" ]] && [[ -d "\${slice_dir}/Modules" ]] && [[ ! -s "\${hash_file}" ]]; then
      echo "\${expected_hash}" > "\${hash_file}"
    fi
  done
}

# KhaaoNow fallback build products
`;

  if (!script.includes(helperAnchor)) {
    throw new Error("Could not find helper anchor in ExpoModulesJSI build script");
  }
  script = script.replace(helperAnchor, `${helperSnippet}\n${helperAnchor}`);

  const oldBuildPathBlock = `  local product_path="\${BUILD_PRODUCTS_PATH}/\${build_dir_name}"
  local framework_src="\${product_path}/PackageFrameworks/\${PACKAGE_NAME}.framework"
  local swiftmodule_src="\${product_path}/\${PACKAGE_NAME}.swiftmodule"
  # GeneratedModuleMaps follows the same $EFFECTIVE_PLATFORM_NAME convention as
  # build products: no suffix for macOS, "-\${platform}" for everything else.
  local generated_maps
  if [[ "$platform" == "macosx" ]]; then
    generated_maps="\${DERIVED_DATA_PATH}/Build/Intermediates.noindex/GeneratedModuleMaps"
  else
    generated_maps="\${DERIVED_DATA_PATH}/Build/Intermediates.noindex/GeneratedModuleMaps-\${platform}"
  fi

  if [[ ! -d "$framework_src" ]]; then
    log "error: xcodebuild did not produce \${framework_src}"
    exit 1
  fi
`;

  const newBuildPathBlock = `  local product_path="\${BUILD_PRODUCTS_PATH}/\${build_dir_name}"
  local framework_src="\${product_path}/PackageFrameworks/\${PACKAGE_NAME}.framework"
  local swiftmodule_src="\${product_path}/\${PACKAGE_NAME}.swiftmodule"
  # GeneratedModuleMaps follows the same $EFFECTIVE_PLATFORM_NAME convention as
  # build products: no suffix for macOS, "-\${platform}" for everything else.
  local generated_maps
  if [[ "$platform" == "macosx" ]]; then
    generated_maps="\${DERIVED_DATA_PATH}/Build/Intermediates.noindex/GeneratedModuleMaps"
  else
    generated_maps="\${DERIVED_DATA_PATH}/Build/Intermediates.noindex/GeneratedModuleMaps-\${platform}"
  fi

  if [[ ! -d "$framework_src" ]] || [[ ! -d "$swiftmodule_src" ]]; then
    local fallback_product_path
    if fallback_product_path=$(find_fallback_product_path "$build_dir_name"); then
      product_path="$fallback_product_path"
      framework_src="\${product_path}/PackageFrameworks/\${PACKAGE_NAME}.framework"
      swiftmodule_src="\${product_path}/\${PACKAGE_NAME}.swiftmodule"
      log "Using fallback build products from \${product_path}"
    fi
  fi

  if [[ ! -f "\${generated_maps}/\${PACKAGE_NAME}-Swift.h" ]]; then
    local fallback_generated_maps
    if fallback_generated_maps=$(find_fallback_generated_maps "$platform"); then
      generated_maps="$fallback_generated_maps"
      log "Using fallback generated module maps from \${generated_maps}"
    fi
  fi

  if [[ ! -d "$framework_src" ]]; then
    log "error: xcodebuild did not produce \${framework_src}"
    exit 1
  fi
`;

  if (!script.includes(oldBuildPathBlock)) {
    throw new Error("Could not find product path block in ExpoModulesJSI build script");
  }
  script = script.replace(oldBuildPathBlock, newBuildPathBlock);

  const oldHashBlock = `current_hash=$(compute_hash)

# Filter out platforms whose slice is already up to date.
platforms_to_build=()
`;

  const newHashBlock = `current_hash=$(compute_hash)
bootstrap_existing_slice_hashes "$current_hash"

# Filter out platforms whose slice is already up to date.
platforms_to_build=()
`;

  if (!script.includes(oldHashBlock)) {
    throw new Error("Could not find hash block in ExpoModulesJSI build script");
  }
  script = script.replace(oldHashBlock, newHashBlock);

  fs.writeFileSync(buildScriptPath, script);
  console.log("Patched ExpoModulesJSI build script for local Xcode derived-data fallback.");
}

// Only pre-run the build here when Pods are already installed (iterative
// local dev, after a prior `pod install`). In a fresh EAS build sandbox
// (postinstall runs before `expo prebuild`/`pod install` even happen),
// there's nothing to build yet - the patched script above is what matters:
// Xcode's own "[CP-User] Build ExpoModulesJSI xcframework" script phase
// invokes build-xcframework.sh itself later, with its own $BUILD_ROOT/
// $SYMROOT already set correctly, and the patch's fallback lookup kicks in
// then.
const podsRoot = path.join(root, "ios", "Pods");
if (!fs.existsSync(podsRoot)) {
  console.log("ios/Pods not installed yet, skipping eager xcframework prebuild (patch already applied).");
  process.exit(0);
}

const env = {
  ...process.env,
  PODS_ROOT: podsRoot,
  REACT_NATIVE_PATH: path.join(root, "node_modules", "react-native"),
};

execFileSync("/bin/bash", [buildScriptPath], {
  cwd: root,
  env,
  stdio: "inherit",
});
