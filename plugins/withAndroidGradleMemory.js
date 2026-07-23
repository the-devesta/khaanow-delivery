const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MEMORY_PROPS = {
  "org.gradle.jvmargs":
    "-Xmx6g -XX:MaxMetaspaceSize=1536m -Dfile.encoding=UTF-8",
  "org.gradle.workers.max": "2",
  "kotlin.daemon.jvmargs": "-Xmx2g -XX:MaxMetaspaceSize=768m",
};

const STABLE_GRADLE_DISTRIBUTION =
  "https\\://services.gradle.org/distributions/gradle-8.14.3-bin.zip";

function upsertGradleProperties(contents) {
  const lines = contents.split(/\r?\n/);

  for (const [key, value] of Object.entries(MEMORY_PROPS)) {
    const nextLine = `${key}=${value}`;
    const index = lines.findIndex((line) => line.startsWith(`${key}=`));

    if (index >= 0) {
      lines[index] = nextLine;
    } else {
      lines.push(nextLine);
    }
  }

  return `${lines.filter(Boolean).join("\n")}\n`;
}

module.exports = function withAndroidGradleMemory(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const gradlePropertiesPath = path.join(
        config.modRequest.platformProjectRoot,
        "gradle.properties"
      );
      const current = fs.existsSync(gradlePropertiesPath)
        ? fs.readFileSync(gradlePropertiesPath, "utf8")
        : "";

      fs.writeFileSync(
        gradlePropertiesPath,
        upsertGradleProperties(current)
      );

      const wrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        "gradle",
        "wrapper",
        "gradle-wrapper.properties"
      );

      if (fs.existsSync(wrapperPath)) {
        const wrapperContents = fs.readFileSync(wrapperPath, "utf8");
        const wrapperLines = wrapperContents.split(/\r?\n/);
        const nextDistributionLine = `distributionUrl=${STABLE_GRADLE_DISTRIBUTION}`;
        const distributionIndex = wrapperLines.findIndex((line) =>
          line.startsWith("distributionUrl=")
        );

        if (distributionIndex >= 0) {
          wrapperLines[distributionIndex] = nextDistributionLine;
        } else {
          wrapperLines.push(nextDistributionLine);
        }

        fs.writeFileSync(
          wrapperPath,
          `${wrapperLines.filter(Boolean).join("\n")}\n`
        );
      }

      return config;
    },
  ]);
};
