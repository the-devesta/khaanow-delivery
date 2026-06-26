type ExpoAV = typeof import("expo-av");

let AudioModule: ExpoAV["Audio"] | null | undefined;
let soundObject: Awaited<
  ReturnType<ExpoAV["Audio"]["Sound"]["createAsync"]>
>["sound"] | null = null;
let isLoading = false;

const getAudio = async () => {
  if (AudioModule !== undefined) return AudioModule;

  try {
    AudioModule = (await import("expo-av")).Audio;
  } catch (error) {
    AudioModule = null;
    console.log("[Ringtone] expo-av is unavailable in this runtime; skipping ringtone.");
  }

  return AudioModule;
};

const initAudio = async () => {
  const Audio = await getAudio();
  if (!Audio) return false;

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    return true;
  } catch (error) {
    console.error("Failed to set audio mode:", error);
    return false;
  }
};

export const playRingtone = async () => {
  try {
    if (soundObject || isLoading) {
      console.log("🔊 Ringtone already playing or loading, skipping...");
      return;
    }

    isLoading = true;
    const Audio = await getAudio();
    if (!Audio || !(await initAudio())) {
      isLoading = false;
      return;
    }

    const { sound } = await Audio.Sound.createAsync(
      require("../assets/sounds/ringtone.mp3"),
      {
        shouldPlay: true,
        isLooping: false,
        volume: 1.0,
      },
    );

    soundObject = sound;
    isLoading = false;
    console.log("🔊 Ringtone started playing");
  } catch (error) {
    isLoading = false;
    console.error("Failed to play ringtone:", error);
  }
};

export const stopRingtone = async () => {
  try {
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
      isLoading = false;
      console.log("🔇 Ringtone stopped");
    }
  } catch (error) {
    console.error("Failed to stop ringtone:", error);
  }
};

export const isRingtonePlaying = () => soundObject !== null;
