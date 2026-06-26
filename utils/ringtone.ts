let ringtoneActive = false;
let warnedUnavailable = false;

function logUnavailableOnce() {
  if (warnedUnavailable) return;
  warnedUnavailable = true;
  console.log(
    "[Ringtone] Native ringtone playback is disabled in this SDK 56 build until it is migrated to a supported audio module.",
  );
}

export const playRingtone = async () => {
  ringtoneActive = false;
  logUnavailableOnce();
};

export const stopRingtone = async () => {
  ringtoneActive = false;
};

export const isRingtonePlaying = () => ringtoneActive;
