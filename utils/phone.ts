import { Alert, Linking } from "react-native";

export function toCallablePhoneUrl(phone?: string | null) {
  if (!phone) return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("+")) {
    const normalized = `+${trimmed.slice(1).replace(/\D/g, "")}`;
    return normalized.length > 1 ? `tel:${normalized}` : null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  const normalized =
    digits.length === 10 ? `+91${digits}` : digits.startsWith("91") ? `+${digits}` : digits;

  return `tel:${normalized}`;
}

export async function openPhoneDialer(phone?: string | null) {
  const url = toCallablePhoneUrl(phone);
  if (!url) {
    Alert.alert("Call unavailable", "No phone number is available for this contact.");
    return false;
  }

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert("Call unavailable", "This device cannot place phone calls.");
    return false;
  }

  await Linking.openURL(url);
  return true;
}
