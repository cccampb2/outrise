import { Pressable, StyleSheet } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { Colors, Fonts } from "@/constants/theme";
import { ApiError } from "@/api/client";
export function messagingError(error: unknown) {
  return error instanceof ApiError ? error.getDisplayMessage() : error instanceof Error ? error.message : "Please try again.";
}
export function MessageButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [messageStyles.button, (pressed || disabled) && { opacity: 0.5 }]}>
    <Text style={messageStyles.buttonText}>{label}</Text>
  </Pressable>;
}
export const messageStyles = StyleSheet.create({
  header: { paddingTop: 8, paddingBottom: 18, gap: 12 },
  title: { fontFamily: Fonts.display, color: Colors.dark.text, fontSize: 28 },
  subtitle: { color: Colors.dark.textMuted, fontSize: 12, lineHeight: 18 },
  row: { paddingVertical: 16, paddingHorizontal: 14, backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1, borderColor: Colors.dark.borderStrong, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.dark.backgroundSelected, alignItems: "center", justifyContent: "center" },
  avatarText: { color: Colors.dark.text, fontSize: 18, fontWeight: "800" },
  name: { color: Colors.dark.text, fontSize: 17, fontWeight: "700" },
  meta: { color: Colors.dark.textMuted, fontSize: 11, marginTop: 5 },
  state: { paddingVertical: 20, gap: 12 },
  error: { color: Colors.dark.danger, fontSize: 12, lineHeight: 18 },
  button: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.dark.borderStrong },
  buttonText: { color: Colors.dark.text, fontSize: 12, fontWeight: "800" },
  bubble: { maxWidth: "88%", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.borderStrong, backgroundColor: Colors.dark.backgroundElement, marginVertical: 5 },
  ownBubble: { alignSelf: "flex-end", backgroundColor: Colors.dark.backgroundSelected, borderColor: Colors.dark.textTechnical },
  otherBubble: { alignSelf: "flex-start" },
  message: { color: Colors.dark.text, fontSize: 15, lineHeight: 22 },
  composer: { paddingTop: 12, gap: 10, borderTopWidth: 1, borderColor: Colors.dark.borderStrong },
  input: { color: Colors.dark.text, fontSize: 15, padding: 12, minHeight: 48, maxHeight: 130, borderWidth: 1, borderColor: Colors.dark.borderStrong, backgroundColor: Colors.dark.backgroundElement },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" },
});
