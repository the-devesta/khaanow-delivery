import { Audio } from "expo-av";

let soundObject: Audio.Sound | null = null;
let isLoading = false;

const initAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  } catch (error) {
    console.error("Failed to set audio mode:", error);
  }
};

export const playRingtone = async () => {
  try {
    if (soundObject || isLoading) {
      console.log("🔊 Ringtone already playing or loading, skipping...");
      return;
    }

    isLoading = true;
    await initAudio();

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
