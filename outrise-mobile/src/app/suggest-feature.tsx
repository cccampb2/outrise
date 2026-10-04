import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { submitSuggestion } from "@/api/suggestions";
import { Screen } from "@/components/screen";
import { BrandHeader } from "@/components/brand-header";
import { AppText as Text } from "@/components/app-text";
import { AdminField, adminAchievementStyles as styles } from "@/components/admin-achievement-ui";
import { AdminButton, adminError } from "@/components/admin-content-ui";
export default function SuggestFeatureScreen() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const mutation = useMutation({ mutationFn: submitSuggestion, retry: false });
  const valid = title.trim().length >= 3 && title.trim().length <= 120 && message.trim().length >= 10 && message.trim().length <= 3000;
  return <Screen scroll keyboardAvoiding bottomInSet={24}><View style={styles.page}>
    <AdminButton label="← BACK" disabled={mutation.isPending} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")} />
    <BrandHeader label="YOUR IDEAS" />
    <Text style={styles.title}>SUGGEST A FEATURE</Text>
    {mutation.isSuccess ? <View style={styles.card}>
      <Text style={styles.cardTitle}>THANK YOU</Text>
      <Text style={styles.text}>{mutation.data.message}</Text>
      <AdminButton label="DONE" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")} />
    </View> : <>
      <Text style={styles.text}>What would make Outrise better? Your suggestion goes directly to the developer and is only visible to the owner.</Text>
      <AdminField label="TITLE (3–120 characters)" value={title} onChange={setTitle} disabled={mutation.isPending} />
      <AdminField label="SUGGESTION (10–3,000 characters)" value={message} onChange={setMessage} multiline disabled={mutation.isPending} />
      {mutation.isError && <Text accessibilityRole="alert" style={styles.error}>{adminError(mutation.error)}</Text>}
      <AdminButton label={mutation.isPending ? "SENDING…" : "SEND SUGGESTION"} disabled={!valid || mutation.isPending}
        onPress={() => mutation.mutate({ title: title.trim(), message: message.trim() })} />
    </>}
  </View></Screen>;
}
