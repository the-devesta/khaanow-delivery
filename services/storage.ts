import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Resolve the backend base URL (same logic as api.ts)
const getBaseUrl = (): string => {
  const envApiUrl =
    Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;
  if (envApiUrl) return envApiUrl;
  return "https://5axnuhvpz7h2mjnrp2ledb7nmy0hmwkh.lambda-url.ap-south-1.on.aws/api";
};

/**
 * Upload image to Firebase Storage via the backend API.
 *
 * The backend uses the Firebase Admin SDK which bypasses Storage security rules,
 * so no Firebase client-side authentication is required.
 *
 * @param uri   Local file URI (e.g. file:///... from image picker)
 * @param folder Folder name in Firebase Storage (e.g. 'kyc_docs', 'profile_photos')
 * @returns     Public download URL of the uploaded image
 */
export const uploadImageToFirebase = async (
  uri: string,
  folder: string = "kyc_docs",
): Promise<string> => {
  if (!uri) return "";

  // Already a remote URL — return as-is
  if (uri.startsWith("http")) return uri;

  try {
    // Get auth token from storage
    const token = await AsyncStorage.getItem("delivery_partner_token");
    if (!token) throw new Error("Not authenticated — no token in storage");

    // Determine MIME type from extension
    const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      heic: "image/heic",
    };
    const mimeType = mimeMap[ext] ?? "image/jpeg";

    // Build FormData
    const formData = new FormData();
    formData.append("image", {
      uri,
      name: `upload-${Date.now()}.${ext}`,
      type: mimeType,
    } as any);
    formData.append("folder", folder);

    const baseUrl = getBaseUrl();
    const uploadUrl = `${baseUrl}/delivery-partners/upload-image`;

    console.log(`📤 [Storage] Uploading to backend: ${uploadUrl}`);

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Do NOT set Content-Type manually — fetch sets it with the correct boundary for multipart
      },
      body: formData,
    });

    const json = await response.json();

    if (!response.ok || !json.success) {
      throw new Error(
        json.message || `Upload failed with status ${response.status}`,
      );
    }

    console.log(`✅ [Storage] Upload successful: ${json.url}`);
    return json.url as string;
  } catch (error: any) {
    console.error("❌ [Storage] Upload error:", error);
    throw new Error(error.message || "Failed to upload image");
  }
};
