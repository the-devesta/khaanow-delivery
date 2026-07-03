import { Platform, StyleSheet } from "react-native";

export const inputTextStyle = StyleSheet.create({
  base: {
    alignSelf: "center",
    fontSize: 15,
    height: 44,
    includeFontPadding: false,
    lineHeight: Platform.OS === "ios" ? 19 : 21,
    paddingBottom: 0,
    paddingTop: 0,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  phone: {
    alignSelf: "center",
    fontSize: 16,
    height: 44,
    includeFontPadding: false,
    lineHeight: Platform.OS === "ios" ? 20 : 22,
    paddingBottom: 0,
    paddingTop: 0,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  phonePrefix: {
    fontSize: 16,
    includeFontPadding: false,
    lineHeight: Platform.OS === "ios" ? 20 : 22,
    paddingBottom: 0,
    paddingTop: 0,
    textAlignVertical: "center",
  },
});
