import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
const KEY = "signup_age_rejected_until";
export const AGE_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;
export async function getSignupAgeRestriction(): Promise<number> {
  const raw =
    Platform.OS === "web"
      ? globalThis.localStorage.getItem(KEY)
      : await SecureStore.getItemAsync(KEY);
  const until = Number(raw);
  return Number.isFinite(until) && until > Date.now() ? until : 0;
}
export async function rememberSignupAgeRejection(): Promise<number> {
  const until = Date.now() + AGE_RETRY_DELAY_MS;
  if (Platform.OS === "web")
    globalThis.localStorage.setItem(KEY, String(until));
  else await SecureStore.setItemAsync(KEY, String(until));
  return until;
}
